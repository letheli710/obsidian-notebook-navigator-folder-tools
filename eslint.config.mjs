// Same rules the Obsidian community plugin review uses (eslint-plugin-obsidianmd, recommended)
import { defineConfig, globalIgnores } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
    globalIgnores(['node_modules', 'main.js', 'esbuild.config.mjs', 'version-bump.mjs']),
    ...obsidianmd.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['eslint.config.*']
                }
            }
        }
    }
]);
