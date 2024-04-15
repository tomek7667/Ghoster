// import {
// 	FastaSequenceFile,
// 	FastqSequenceFile,
// 	GenbankSequencesFile,
// } from "biotech-js";
// import { dialog, shell } from "electron";
// import { writeFileSync, readFileSync } from "fs";

// export const run = async (
// 	sequencesNamesFilePath: string,
// 	sequencesFilesPaths: string[],
// 	k0Value: string
// ) => {};

// export const saveFastaFile = (
// 	sequences: { name: string; sequence: string }[],
// 	filePath: string
// ) => {
// 	const content = sequences
// 		.map((sequence) => {
// 			let sequenceText = `>${sequence.name}\n`;
// 			for (let i = 0; i < sequence.sequence.length; i += 60) {
// 				sequenceText += sequence.sequence.slice(i, i + 60) + "\n";
// 			}
// 			return sequenceText;
// 		})
// 		.join("");

// 	writeFileSync(filePath, content);
// };
