import path from "path";
import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	IpcMainEvent,
	shell,
} from "electron";
import * as ExcelJS from "exceljs";
import {
	writeFileSync,
	mkdirSync,
	createReadStream,
	createWriteStream,
} from "fs";
import zlib from "zlib";
import { FileExtensionHandler } from "biotech-js";

import { generateHeatmap } from "./lib";

import {
	checkGhostStatus,
	getFastaFileContent,
	readSequences,
	splitSequences,
	uploadGhostFiles,
} from "./lib/ghost";

const CHECK_INTERVAL_SECONDS = 3;

interface Heatmap {
	k0s: string[];
	heatmap: {
		bacteria: string;
		amounts: number[];
	}[];
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require("electron-squirrel-startup")) {
	app.quit();
}

const createWindow = (): void => {
	const icon = path.join(__dirname, "images/favicon.png");
	const mainWindow = new BrowserWindow({
		width: 1270,
		height: 800,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			nodeIntegration: true,
		},
		icon,
	});

	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
	// mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

ipcMain.on("getAppVersion", (event) => [
	event.sender.send("appVersion", app.getVersion()),
]);

ipcMain.on("pick-ghost-files", (event) => {
	const files = dialog.showOpenDialogSync({
		properties: ["openFile", "multiSelections"],
		filters: [{ name: "CSV Files", extensions: ["csv"] }],
	});
	if (files) {
		event.sender.send("pick-ghost-files", files);
	}
});

ipcMain.on("pick-k0-file", (event) => {
	const file = dialog.showOpenDialogSync({
		properties: ["openFile"],
		filters: [{ name: "CSV Files", extensions: ["csv"] }],
	});
	if (file) {
		event.sender.send("pick-k0-file", file[0]);
	}
});

ipcMain.on(
	"run-heatmap",
	async (event, args: { csvpaths: string[]; k0path: string }) => {
		const { csvpaths, k0path } = args;
		if (csvpaths.length === 0) {
			event.sender.send("run-heatmap", {
				success: false,
				errorMessage: "No ghost files selected",
			});
			return;
		}
		if (k0path === "") {
			event.sender.send("run-heatmap", {
				success: false,
				errorMessage: "No k0 file selected",
			});
			return;
		}
		const heatmap = generateHeatmap(csvpaths, k0path);
		event.sender.send("run-heatmap", { success: true, heatmap });
	}
);

ipcMain.on("save-heatmap-csv", async (event, heatmap: Heatmap) => {
	const delimiter = "\t";
	const csv = delimiter + heatmap.k0s.join(delimiter) + "\n";
	const csvRows = heatmap.heatmap.map((row) => {
		return [row.bacteria, ...row.amounts].join(delimiter);
	});
	const csvString = csv + csvRows.join("\n");
	const cd = new Date();
	const dateStr = `${cd.getFullYear()}-${cd
		.getMonth()
		.toString()
		.padStart(2, "0")}-${cd.getDate().toString().padStart(2, "0")}_${cd
		.getHours()
		.toString()
		.padStart(2, "0")}-${cd.getMinutes().toString().padStart(2, "0")}`;
	const file = dialog.showSaveDialogSync({
		title: "Save Heatmap as CSV",
		defaultPath: `HeatMap___${dateStr}.csv`,
		filters: [
			{
				name: "CSV Files",
				extensions: ["csv"],
			},
		],
	});
	if (file) {
		writeFileSync(file, csvString);
		shell.showItemInFolder(file);
	}
});

const createExcelFile = async (path: string, heatmap: Heatmap) => {
	// Create a new workbook and a worksheet
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Heatmap");

	// Add the header row
	worksheet.addRow(["", ...heatmap.k0s]);

	// Add data rows
	heatmap.heatmap.forEach((row) => {
		worksheet.addRow([row.bacteria, ...row.amounts]);
	});
	let min = 999999;
	let max = -999999;
	for (let i = 0; i < heatmap.heatmap.length; i++) {
		const row = heatmap.heatmap[i];
		for (let j = 0; j < row.amounts.length; j++) {
			const amount = row.amounts[j];
			if (amount < min) {
				min = amount;
			}
			if (amount > max) {
				max = amount;
			}
		}
	}
	worksheet.addConditionalFormatting({
		ref: "B2:Z10000",
		rules: [
			{
				priority: 1,
				type: "colorScale",
				cfvo: [
					{
						type: "min",
						value: min,
					},
					{
						type: "max",
						value: max,
					},
				],
				color: [
					{
						argb: "FFFFFF",
					},
					{
						argb: "FF0000",
					},
				],
			},
		],
	});
	const buffer = await workbook.xlsx.writeBuffer();
	writeFileSync(path, buffer as Buffer);
};

ipcMain.on("save-heatmap-excel", async (event, heatmap: Heatmap) => {
	const cd = new Date();
	const dateStr = `${cd.getFullYear()}-${cd
		.getMonth()
		.toString()
		.padStart(2, "0")}-${cd.getDate().toString().padStart(2, "0")}_${cd
		.getHours()
		.toString()
		.padStart(2, "0")}-${cd.getMinutes().toString().padStart(2, "0")}`;
	const excelFile = dialog.showSaveDialogSync({
		title: "Save Heatmap as Excel",
		defaultPath: `HeatMap___${dateStr}.xlsx`,
		filters: [
			{
				name: "Excel Files",
				extensions: ["xlsx"],
			},
		],
	});
	if (excelFile) {
		await createExcelFile(excelFile, heatmap);
		shell.showItemInFolder(excelFile);
	}
});

ipcMain.on("pick-sequences-files", async (event) => {
	const files = dialog.showOpenDialogSync({
		properties: ["openFile", "multiSelections"],
		filters: [
			{
				name: "Sequences files",
				extensions: [
					...FileExtensionHandler.Fasta(),
					...FileExtensionHandler.Fastq(),
					...FileExtensionHandler.Genbank(),
				],
			},
		],
	});
	if (files) {
		event.sender.send("pick-sequences-files", files);
	}
});

let intervalId: NodeJS.Timeout;
let sessionId: string;
ipcMain.on(
	"send-sequences-files",
	async (event: IpcMainEvent, files: string[]) => {
		try {
			const _sessionId = Math.random().toString(36).substring(7);
			// 1. read sequences
			setStatus(event, "1/5 Reading sequences...", "link");
			const sequences = await readSequences(files);
			// 2. split sequences into 500_000 sequences fasta files
			setStatus(event, "2/5 Splitting sequences...", "link");
			const splittedSequencesFiles = splitSequences(sequences, 500_000);
			// 3. saving splitted sequences files
			setStatus(event, `3/5 Saving splitted sequences files...`, "link");
			const contents = splittedSequencesFiles.map((file) =>
				getFastaFileContent(file.sequences)
			);
			// 4. Upload them to ghost koala
			for (let i = 0; i < contents.length; i++) {
				setStatus(
					event,
					`4/5 Uploading sequences to Ghost Koala... (${i + 1}/${
						contents.length
					})`,
					"link"
				);
				const fastaContent = contents[i];
				await uploadGhostFiles(fastaContent, _sessionId, i);
			}

			// 5. Send back the session id
			setStatus(
				event,
				`5/5 All sequences uploaded. Running status checker each ${CHECK_INTERVAL_SECONDS} seconds...`,
				"success"
			);
			sessionId = _sessionId;
			event.sender.send("send-sequences-files", {
				sessionId,
			});
		} catch (error) {
			// console.log("send-sequences-files", error);
			setStatus(event, error?.message, "danger");
		}
	}
);

const setStatus = (event: IpcMainEvent, message: string, type: string) => {
	event.sender.send("check-sequences-status", {
		message,
		type,
	});
};

ipcMain.on("abort-sequences-status", async (event, sessionId: string) => {
	clearInterval(intervalId);
});

ipcMain.on("check-sequences-status", async (event, _sessionId: string) => {
	sessionId = _sessionId;
	intervalId = setInterval(async () => {
		try {
			const { completelyDone, ghostkoalaStatus, resultBase64 } =
				await checkGhostStatus(sessionId);
			setStatus(
				event,
				`(${new Date().toLocaleString()}) Checking sequences status for session ID = ${sessionId}: <br /><br />Status of the job on the page:<br /><b>${ghostkoalaStatus}</b><br />completelyDone = ${completelyDone}`,
				"warning"
			);
			if (completelyDone) {
				clearInterval(intervalId);
				setStatus(
					event,
					`(${new Date().toLocaleString()}) Job is done. Downloading the result...`,
					"success"
				);
				const tempDir = path.join(app.getPath("temp"), sessionId);
				mkdirSync(tempDir, { recursive: true });
				const resultFile = path.join(tempDir, "result.top.gz");
				writeFileSync(resultFile, Buffer.from(resultBase64, "base64"));
				setStatus(
					event,
					`(${new Date().toLocaleString()}) Result downloaded to ${resultFile}. Unzipping...`,
					"success"
				);
				const destFile = resultFile.replace(".gz", ".csv");
				await gunzipFile(resultFile, destFile);
				setStatus(
					event,
					`(${new Date().toLocaleString()}) Result unzipped to ${destFile}.`,
					"success"
				);
				event.sender.send("csv-saved", destFile);
			}
		} catch (error) {
			// console.log("check-sequences-status", error);
			setStatus(
				event,
				`${error?.message}<br /><br />If you are getting not-existing records, just wait for the e-mail confirmation to hit the worker.`,
				"danger"
			);
		}
	}, CHECK_INTERVAL_SECONDS * 1000);
});

function gunzipFile(sourcePath: string, destPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		// Create a read stream
		const readStream = createReadStream(sourcePath);
		// Create a write stream
		const writeStream = createWriteStream(destPath);
		// Create a gunzip transform stream
		const unzip = zlib.createGunzip();

		// Pipe the read stream through the unzip stream into the write stream
		readStream
			.pipe(unzip)
			.pipe(writeStream)
			.on("finish", () => {
				resolve();
			})
			.on("error", (err) => {
				console.error("Error during decompression:", err);
				reject(err);
			});
	});
}
