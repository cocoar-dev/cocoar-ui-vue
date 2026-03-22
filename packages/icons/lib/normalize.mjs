/**
 * Normalize SVG Icons
 *
 * Validates and normalizes SVG icons from a source directory,
 * writes cleaned SVGs to an output directory, and generates
 * a _manifest.json with all icon names.
 *
 * Useful for preparing icons for HTTP serving with CoarHttpIconSource.
 */

import { readdir, readFile, mkdir, writeFile } from 'fs/promises';
import { join, parse, resolve } from 'path';
import { normalizeSvg, validateSvg } from './svg-utils.mjs';

function parseArgs(args) {
  let from = null;
  let output = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && i + 1 < args.length) {
      from = args[i + 1];
    } else if (args[i] === '--output' && i + 1 < args.length) {
      output = args[i + 1];
    }
  }

  return { from, output };
}

export async function normalize(args) {
  const { from: fromArg, output: outputArg } = parseArgs(args);

  if (!fromArg || !outputArg) {
    console.error('Usage: cocoar-icons normalize --from <svg-directory> --output <directory>');
    console.error('');
    console.error('Examples:');
    console.error('  cocoar-icons normalize --from ./my-svgs --output ./public/icons');
    console.error('  cocoar-icons normalize --from ./node_modules/lucide-static/icons --output ./public/icons/lucide');
    process.exit(1);
  }

  const sourceDir = resolve(process.cwd(), fromArg);
  const outputDir = resolve(process.cwd(), outputArg);

  console.warn('📦 Normalizing icons...');
  console.warn(`📂 Source: ${sourceDir}`);
  console.warn(`📝 Output: ${outputDir}`);

  const files = await readdir(sourceDir);
  const svgFiles = files.filter((f) => f.endsWith('.svg')).sort();

  if (svgFiles.length === 0) {
    console.error(`❌ No SVG files found in ${sourceDir}`);
    process.exit(1);
  }

  console.warn(`📁 Found ${svgFiles.length} SVG icons`);

  await mkdir(outputDir, { recursive: true });

  let copied = 0;
  let skipped = 0;
  const copiedNames = [];

  for (const file of svgFiles) {
    const content = await readFile(join(sourceDir, file), 'utf-8');

    try {
      validateSvg(content, file);
    } catch {
      console.warn(`  ⚠️  Skipped ${file} (failed validation)`);
      skipped++;
      continue;
    }

    const normalized = normalizeSvg(content);
    await writeFile(join(outputDir, file), normalized, 'utf-8');
    copiedNames.push(parse(file).name);
    copied++;
  }

  console.warn(`✅ Copied ${copied} icons to ${outputDir}`);
  if (skipped > 0) {
    console.warn(`⚠️  Skipped ${skipped} icons (failed validation)`);
  }

  await writeFile(
    join(outputDir, '_manifest.json'),
    JSON.stringify(copiedNames, null, 2),
    'utf-8',
  );
  console.warn(`📋 Wrote _manifest.json with ${copiedNames.length} icon names`);
}
