import packageJson from "./package.json";
import type { ForgeConfig } from "@electron-forge/shared-types";
import path from "path";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";

const icon = path.join(__dirname, "images/favicon.png");

const config: ForgeConfig = {
	packagerConfig: {
		name: packageJson.productName,
		asar: true,
		overwrite: true,
		icon,
	},
	rebuildConfig: {},
	makers: [
		new MakerSquirrel({}),
		new MakerZIP({}, ["darwin"]),
		new MakerRpm({}),
		new MakerDeb({}),
	],
	plugins: [
		new AutoUnpackNativesPlugin({ icon }),
		new WebpackPlugin({
			mainConfig,
			renderer: {
				config: rendererConfig,
				entryPoints: [
					{
						html: "./src/index.html",
						js: "./src/renderer.ts",
						name: "main_window",
						preload: {
							js: "./src/preload.ts",
						},
					},
				],
			},
			port: 12345,
			loggerPort: 12346,
		}),
	],
};

export default config;
