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
	const url = `https://www.kegg.jp:443/kegg-bin/blastkoala_request`;
	const headers = {
		Origin: "https://www.kegg.jp",
		Accept:
			"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
		Referer: "https://www.kegg.jp/ghostkoala/",
		"Content-Type":
			"multipart/form-data; boundary=----WebKitFormBoundary0anAcwBBPlduQWHP",
	};
	const body = `------WebKitFormBoundary0anAcwBBPlduQWHP
Content-Disposition: form-data; name="sequence_data"


------WebKitFormBoundary0anAcwBBPlduQWHP
Content-Disposition: form-data; name="input_file"; filename="short.fa"
Content-Type: application/octet-stream

${fastaContent}

------WebKitFormBoundary0anAcwBBPlduQWHP
Content-Disposition: form-data; name="db_type"

c_family_euk+genus_prok+viruses
------WebKitFormBoundary0anAcwBBPlduQWHP
Content-Disposition: form-data; name="email"

${email}
------WebKitFormBoundary0anAcwBBPlduQWHP
Content-Disposition: form-data; name="type"

ghostkoala
------WebKitFormBoundary0anAcwBBPlduQWHP--
`;
	const response = await fetch(url, {
		method: "POST",
		headers,
		body,
	});
	const text = await response.text();
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
