import { ipcRenderer } from "electron";

export const blockElement = (element: HTMLElement) => {
	element.classList.add("is-disabled");
	element.classList.add("disabled");
	element.classList.add("is-loading");
	if (element instanceof HTMLInputElement) {
		element.disabled = true;
	}
};

export const unblockElement = (element: HTMLElement) => {
	element.classList.remove("is-disabled");
	element.classList.remove("disabled");
	element.classList.remove("is-loading");
	if (element instanceof HTMLInputElement) {
		element.disabled = false;
	}
};

interface Heatmap {
	k0s: string[];
	heatmap: {
		bacteria: string;
		amounts: number[];
	}[];
}

window.addEventListener("DOMContentLoaded", () => {
	// HTML and inputs
	let csvpaths: string[] = [];
	let k0path: string = "";
	let heatmap: Heatmap = {
		k0s: [],
		heatmap: [],
	};
	let sequencesFilesPaths: string[] = [];

	const sequenceFilesUl = document.getElementById("sequence-files-ul");
	const pickSequencesButton = document.getElementById(
		"pick-sequence-file-button"
	);
	const tableWrapper = document.getElementById("table-wrapper");
	const ghostFilesUl = document.getElementById("ghost-files-ul");
	const k0FileUl = document.getElementById("k0-file-ul");
	const pickK0Button = document.getElementById("pick-k0-button");
	const pickGhostFilesButton = document.getElementById(
		"pick-ghost-files-button"
	);
	const runButton = document.getElementById("run-button");
	const showTableCheckbox: any = document.getElementById("show-table-checkbox");
	const shouldRunNextCheckbox: any = document.getElementById(
		"should-run-next-checkbox"
	);

	const updateGhostFiles = () => {
		clearGhostFiles();
		csvpaths.forEach((csv) => {
			const li = document.createElement("li");
			li.innerText = csv;
			ghostFilesUl.appendChild(li);
		});
	};
	const clearGhostFiles = () => {
		ghostFilesUl.innerHTML = "";
	};

	const updateK0File = () => {
		clearK0File();
		const li = document.createElement("li");
		li.innerText = k0path;
		k0FileUl.appendChild(li);
	};
	const clearK0File = () => {
		k0FileUl.innerHTML = "";
	};

	const generateHeatmapTable = (buildTable: boolean) => {
		clearHeatmapTable();
		const buttonsDiv = document.createElement("div");
		buttonsDiv.classList.add("buttons");

		const saveCsvButton = document.createElement("button");
		saveCsvButton.innerText = "Save as CSV";
		saveCsvButton.classList.add("button");
		saveCsvButton.classList.add("is-primary");
		saveCsvButton.classList.add("is-outlined");

		saveCsvButton.addEventListener("click", () => {
			ipcRenderer.send("save-heatmap-csv", heatmap);
		});
		const saveExcelButton = document.createElement("button");
		saveExcelButton.innerText = "Save as Excel";
		saveExcelButton.classList.add("button");
		saveExcelButton.classList.add("is-link");
		saveExcelButton.classList.add("is-outlined");

		saveExcelButton.addEventListener("click", () => {
			ipcRenderer.send("save-heatmap-excel", heatmap);
		});
		buttonsDiv.appendChild(saveCsvButton);
		buttonsDiv.appendChild(saveExcelButton);
		tableWrapper.appendChild(buttonsDiv);
		if (!buildTable) {
			return;
		}
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
		const range = max - min;

		const colorValueCell = (amount: number) => {
			const value = (amount - min) / range;
			if (value < 0.15) {
				return "rgba(255, 102, 133, 1)";
			} else if (value < 0.3) {
				return "rgba(191.25, 76, 100, 1)";
			} else if (value < 0.45) {
				return "rgba(153, 45, 60, 1)";
			} else if (value < 0.6) {
				return "rgba(114.75, 21, 27, 1)";
			} else if (value < 0.75) {
				return "rgba(76.5, 6, 8, 1)";
			} else {
				return "rgba(38.25, 1, 1, 1)";
			}
		};
		const table = document.createElement("table");
		const thead = document.createElement("thead");
		const tbody = document.createElement("tbody");
		const emptyTh = document.createElement("th");
		emptyTh.innerText = "";
		thead.appendChild(emptyTh);
		for (let i = 0; i < heatmap.k0s.length; i++) {
			const k0 = heatmap.k0s[i];
			const th = document.createElement("th");
			th.innerText = k0;
			thead.appendChild(th);
		}
		for (let i = 0; i < heatmap.heatmap.length; i++) {
			const row = heatmap.heatmap[i];
			const tr = document.createElement("tr");
			const bacteriaTd = document.createElement("td");
			bacteriaTd.innerText = row.bacteria;
			tr.appendChild(bacteriaTd);
			for (let j = 0; j < row.amounts.length; j++) {
				const amount = row.amounts[j];
				const td = document.createElement("td");
				td.innerText = amount.toString();
				td.style.backgroundColor = colorValueCell(amount);
				td.style.fontWeight = "bold";
				td.style.color = "white";
				td.style.textAlign = "center";
				td.addEventListener("mouseover", () => {
					td.classList.add("has-background-danger-light");
					td.style.color = "black";
				});
				td.addEventListener("mouseout", () => {
					td.classList.remove("has-background-danger-light");
					td.style.color = "white";
				});
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}

		table.appendChild(thead);
		table.appendChild(tbody);
		tableWrapper.appendChild(table);
	};
	const clearHeatmapTable = () => {
		tableWrapper.innerHTML = "";
	};

	const updateSequencesFiles = () => {
		clearSequencesFiles();
		sequencesFilesPaths.forEach((csv) => {
			const li = document.createElement("li");
			li.innerText = csv;
			sequenceFilesUl.appendChild(li);
		});
	};
	const clearSequencesFiles = () => {
		sequenceFilesUl.innerHTML = "";
	};

	// LOGIC
	ipcRenderer.send("getAppVersion");
	ipcRenderer.on("appVersion", (event, appVersion) => {
		document.getElementById(
			"title"
		).innerText = `Ghoster Heatmap ${appVersion}`;
	});

	runButton.addEventListener("click", () => {
		blockElement(runButton);
		blockElement(pickGhostFilesButton);
		blockElement(pickK0Button);
		ipcRenderer.send("run-heatmap", { csvpaths, k0path });
	});
	ipcRenderer.on("run-heatmap", (event, args) => {
		const { success, errorMessage, heatmap: newHeatmap } = args;
		if (!success && errorMessage) {
			alert(errorMessage);
		}
		unblockElement(runButton);
		unblockElement(pickGhostFilesButton);
		unblockElement(pickK0Button);
		if (success) {
			heatmap = newHeatmap;
			const wantHeatmapTable = showTableCheckbox.checked;

			generateHeatmapTable(wantHeatmapTable);
		}
	});

	pickGhostFilesButton.addEventListener("click", () => {
		ipcRenderer.send("pick-ghost-files");
	});
	ipcRenderer.on("pick-ghost-files", (event, files) => {
		csvpaths = files;
		updateGhostFiles();
	});
	pickK0Button.addEventListener("click", () => {
		ipcRenderer.send("pick-k0-file");
	});
	ipcRenderer.on("pick-k0-file", (event, file) => {
		k0path = file;
		updateK0File();
	});

	pickSequencesButton.addEventListener("click", () => {
		ipcRenderer.send("pick-sequences-files");
	});
	ipcRenderer.on("pick-sequences-files", (event, files) => {
		sequencesFilesPaths = files;
		updateSequencesFiles();
	});
	ipcRenderer.on("csv-saved", (event, csvPath) => {
		csvpaths = [csvPath];
		if (shouldRunNextCheckbox.checked) {
			runButton.click();
		}
	});
});
