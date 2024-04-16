import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { writeFileSync } from "fs";
import * as ExcelJS from "exceljs";
import path from "path";
import { generateHeatmap } from "./lib";
import { FileExtension, FileExtensionHandler } from "biotech-js";

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
