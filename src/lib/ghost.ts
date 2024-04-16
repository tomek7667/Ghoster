import {
	FastaSequenceFile,
	FastqSequenceFile,
	FileExtension,
	FileExtensionHandler,
	GenbankSequencesFile,
} from "biotech-js";

export const readSequences = async (files: string[]) => {
	const sequences: { name: string; sequence: string }[] = [];
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
				sequences.push(..._sequences);
				break;
			}
			case FileExtension.Fastq: {
				const file = new FastqSequenceFile(sequencePath);
				await file.process();
				const _sequences = file.sequences.map((sequence) => ({
					name: sequence.sequenceIdentifier1,
					sequence: sequence.sequence,
				}));
				sequences.push(..._sequences);
				break;
			}
			case FileExtension.Genbank: {
				const file = new GenbankSequencesFile(sequencePath);
				await file.process();
				const _sequences = file.sequences.map((sequence) => ({
					name: sequence.Locus.Name,
					sequence: sequence.Origin,
				}));
				sequences.push(..._sequences);
				break;
			}
			default:
				throw new Error(`Invalid file extension: ${sequencePath}`);
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
	sessionId: string
) => {
	const email = `koala_${sessionId}@cyber-man.pl`;
	// TODO: upload to ghost koala
};
