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

window.addEventListener("DOMContentLoaded", () => {
	ipcRenderer.send("getAppVersion");

	ipcRenderer.on("appVersion", (event, appVersion) => {
		document.getElementById(
			"title"
		).innerText = `examplename ${appVersion}`;
	});

	ipcRenderer.on("run", (event, args) => {
		const { success, errorMessage } = args;
		if (!success && errorMessage) {
			alert(errorMessage);
		}
	});
});
