import { readFileSync } from "fs";

interface Heatmap {
	k0s: string[];
	heatmap: {
		bacteria: string;
		amounts: number[];
	}[];
}

const readGhosts = (ghostsPaths: string[]): string[][] => {
	const ghosts: string[][] = [];
	ghostsPaths.map((path) => {
		const content = readFileSync(path, "utf-8");
		const lines = content.split(/\r?\n/g);
		lines.map((line) => {
			ghosts.push(line.split("\t"));
		});
	});
	return ghosts;
};

const readK0s = (k0path: string): string[] => {
	const content = readFileSync(k0path, "utf-8");
	return content.split(/\r?\n/g).slice(1);
};

export const generateHeatmap = (
	csvpaths: string[],
	k0path: string
): Heatmap => {
	const k0s = readK0s(k0path);
	const ghosts = readGhosts(csvpaths);
	const uniqueBacterias: string[] = [];
	ghosts.forEach((ghost) => {
		const [a, k0, b, c, bacteria] = ghost;
		if (!uniqueBacterias.includes(bacteria)) {
			uniqueBacterias.push(bacteria);
		}
	});
	const heatmap: {
		bacteria: string;
		amounts: number[];
	}[] = [];

	const map: { [key: string]: number } = {};
	uniqueBacterias.forEach((bacteria) => {
		k0s.forEach((k0) => {
			map[JSON.stringify({ k0, bacteria })] = 0;
		});
	});
	ghosts.forEach((ghost) => {
		const [a, k0, b, c, bacteria] = ghost;
		const m = map[JSON.stringify({ k0, bacteria })];
		if (m !== undefined) {
			map[JSON.stringify({ k0, bacteria })] = m + 1;
		}
	});

	uniqueBacterias.forEach((bacteria) => {
		var amounts: number[] = [];
		k0s.forEach((k0) => {
			const m = map[JSON.stringify({ k0, bacteria })];
			if (m !== undefined) {
				amounts.push(m);
			}
		});
		if (amounts.length > 0) {
			heatmap.push({ bacteria, amounts });
		}
	});

	return {
		k0s,
		heatmap: heatmap.filter((r) => r.amounts.some((a) => a > 0)),
	};
};
