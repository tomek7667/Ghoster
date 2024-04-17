import PocketBase from "pocketbase";
import axios from "axios";
import FData from "form-data";
import {
	FastaSequenceFile,
	FastqSequenceFile,
	FileExtension,
	FileExtensionHandler,
	GenbankSequencesFile,
} from "biotech-js";

export const readSequences = async (files: string[]) => {
	let sequences: { name: string; sequence: string }[] = [];
	for (let i = 0; i < files.length; i++) {
		const sequencePath = files[i];
		const extension = FileExtensionHandler.fileExtensionToEnum(
			sequencePath.split(".").pop()
		);
		switch (extension) {
			case FileExtension.Fasta: {
				const file = new FastaSequenceFile(sequencePath);
				await file.process();
				const _sequences = file.sequences.map((sequence) => ({
					name: sequence.description,
					sequence: sequence.sequence,
				}));
				sequences = sequences.concat(_sequences);
				break;
			}
			case FileExtension.Fastq: {
				const file = new FastqSequenceFile(sequencePath);
				await file.process();
				const _sequences = file.sequences.map((sequence) => ({
					name: sequence.sequenceIdentifier1,
					sequence: sequence.sequence,
				}));
				sequences = sequences.concat(_sequences);
				break;
			}
			case FileExtension.Genbank: {
				const file = new GenbankSequencesFile(sequencePath);
				await file.process();
				const _sequences = file.sequences.map((sequence) => ({
					name: sequence.Locus.Name,
					sequence: sequence.Origin,
				}));
				sequences = sequences.concat(_sequences);
				break;
			}
			default: {
				throw new Error(`Invalid file extension: ${sequencePath}`);
			}
		}
	}
	return sequences;
};

export const splitSequences = (
	sequences: { name: string; sequence: string }[],
	maxSequencesPerFile: number
) => {
	const files: {
		filename: string;
		sequences: { name: string; sequence: string }[];
	}[] = [];
	for (let i = 0; i < sequences.length; i += maxSequencesPerFile) {
		files.push({
			filename: `sequences-${i}-${i + maxSequencesPerFile}.fasta`,
			sequences: sequences.slice(i, i + maxSequencesPerFile),
		});
	}
	return files;
};

export const getFastaFileContent = (
	sequences: { name: string; sequence: string }[]
) => {
	const content = sequences
		.map((sequence) => {
			let sequenceText = `>${sequence.name}\n`;
			for (let i = 0; i < sequence.sequence.length; i += 60) {
				sequenceText += sequence.sequence.slice(i, i + 60) + "\n";
			}
			return sequenceText;
		})
		.join("");

	return content;
};

export const uploadGhostFiles = async (
	fastaContent: string,
	sessionId: string,
	i: number
) => {
	const email = `koala_${sessionId}@cyber-man.pl`;
	const url = `https://www.kegg.jp:443/kegg-bin/blastkoala_request`;
	const body = new FData();
	body.append("sequence_data", "");
	body.append("input_file", fastaContent, `${sessionId}_${i}.fa`);
	body.append("db_type", "c_family_euk+genus_prok+viruses");
	body.append("email", email);
	body.append("type", "ghostkoala");
	const headers = {
		Origin: "https://www.kegg.jp",
		Accept:
			"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
		Referer: "https://www.kegg.jp/ghostkoala/",
		Connection: "close",
		...body.getHeaders(),
	};
	const response = await axios.postForm(url, body, {
		headers,
		timeout: 60 * 60 * 1000,
	});
	const text = response.data;
	if (text.includes("An email has been sent to")) {
		return;
	} else {
		throw new Error(
			`Error uploading to ghost koala: ${
				text.split('<input type=hidden name=message value="')[1].split('">')[0]
			}`
		);
	}
};

export const checkGhostStatus = async (sessionId: string) => {
	const pb = new PocketBase("https://pocketbase.cyber-man.pl");
	const record = await pb
		.collection("gk_emails_sent")
		.getFirstListItem(`receiverEmail="koala_${sessionId}@cyber-man.pl"`);

	return record;
};
