import { Configuration } from "webpack";
// eslint-disable-next-line import/default
import CopyWebpackPlugin from "copy-webpack-plugin";

import { rules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

export const mainConfig: Configuration = {
	/**
	 * This is the main entry point for your application, it's the first file
	 * that runs in the main process.
	 */
	entry: "./src/index.ts",
	// Put your normal webpack config below here
	module: {
		rules,
	},
	plugins: [
		...plugins,
		new CopyWebpackPlugin({
			patterns: [
				{
					from: "images",
					to: "images",
				},
			],
		}),
	],
	resolve: {
		extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
	},
};
