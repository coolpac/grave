#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * 
 * Analyzes the built bundle and reports:
 * - Total bundle size
 * - Chunk sizes
 * - First Load JS size
 * - Recommendations
 * 
 * Usage:
 *   node scripts/analyze-bundle.js
 */

import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const distDir = join(__dirname, '../dist')

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const getFileSize = async (filePath) => {
  try {
    const stats = await stat(filePath)
    return stats.size
  } catch (error) {
    return 0
  }
}

const analyzeBundle = async () => {
  console.log('\n📦 Bundle Size Analysis\n')
  console.log('='.repeat(80))

  try {
    const files = await readdir(distDir, { recursive: true })
    const jsFiles = files.filter((file) => file.endsWith('.js'))
    const cssFiles = files.filter((file) => file.endsWith('.css'))
    const assetFiles = files.filter(
      (file) =>
        !file.endsWith('.js') &&
        !file.endsWith('.css') &&
        !file.endsWith('.html'),
    )

    // Analyze JS files
    const jsChunks = []
    let totalJSSize = 0
    let firstLoadJSSize = 0

    for (const file of jsFiles) {
      const filePath = join(distDir, file)
      const size = await getFileSize(filePath)
      totalJSSize += size

      // Main entry point and vendor-react are first load
      if (
        file.includes('main') ||
        file.includes('vendor-react') ||
        file.includes('App')
      ) {
        firstLoadJSSize += size
      }

      jsChunks.push({
        name: file,
        size,
      })
    }

    // Analyze CSS files
    let totalCSSSize = 0
    const cssChunks = []

    for (const file of cssFiles) {
      const filePath = join(distDir, file)
      const size = await getFileSize(filePath)
      totalCSSSize += size
      cssChunks.push({
        name: file,
        size,
      })
    }

    // Analyze assets
    let totalAssetSize = 0
    for (const file of assetFiles) {
      const filePath = join(distDir, file)
      totalAssetSize += await getFileSize(filePath)
    }

    const totalSize = totalJSSize + totalCSSSize + totalAssetSize

    // Sort chunks by size
    jsChunks.sort((a, b) => b.size - a.size)
    cssChunks.sort((a, b) => b.size - a.size)

    // Report results
    console.log('\n📊 JavaScript Chunks:\n')
    jsChunks.forEach((chunk, index) => {
      const percentage = ((chunk.size / totalJSSize) * 100).toFixed(1)
      const indicator = chunk.size > 200 * 1024 ? '⚠️ ' : '✅ '
      console.log(
        `${indicator}${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)} (${percentage}%)`,
      )
    })

    console.log('\n📄 CSS Files:\n')
    cssChunks.forEach((chunk, index) => {
      const percentage = ((chunk.size / totalCSSSize) * 100).toFixed(1)
      console.log(
        `${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)} (${percentage}%)`,
      )
    })

    console.log('\n📈 Summary:\n')
    console.log(`Total JavaScript: ${formatBytes(totalJSSize)}`)
    console.log(`First Load JS: ${formatBytes(firstLoadJSSize)}`)
    console.log(`Total CSS: ${formatBytes(totalCSSSize)}`)
    console.log(`Total Assets: ${formatBytes(totalAssetSize)}`)
    console.log(`Total Bundle: ${formatBytes(totalSize)}`)

    // Recommendations
    console.log('\n💡 Recommendations:\n')

    if (firstLoadJSSize > 200 * 1024) {
      console.log(
        `⚠️  First Load JS (${formatBytes(firstLoadJSSize)}) exceeds 200KB target`,
      )
      console.log('   - Consider further code splitting')
      console.log('   - Move heavy libraries to separate chunks')
      console.log('   - Use dynamic imports for non-critical features')
    } else {
      console.log(
        `✅ First Load JS (${formatBytes(firstLoadJSSize)}) is under 200KB`,
      )
    }

    if (totalJSSize > 500 * 1024) {
      console.log(
        `⚠️  Total JS (${formatBytes(totalJSSize)}) exceeds 500KB target`,
      )
      console.log('   - Review large chunks above')
      console.log('   - Consider tree-shaking unused code')
      console.log('   - Use dynamic imports for routes')
    } else {
      console.log(`✅ Total JS (${formatBytes(totalJSSize)}) is under 500KB`)
    }

    // Large chunks warning
    const largeChunks = jsChunks.filter((chunk) => chunk.size > 200 * 1024)
    if (largeChunks.length > 0) {
      console.log('\n⚠️  Large Chunks (>200KB):')
      largeChunks.forEach((chunk) => {
        console.log(`   - ${chunk.name}: ${formatBytes(chunk.size)}`)
      })
      console.log('   Consider splitting these chunks further')
    }

    // Check for code splitting effectiveness
    if (jsChunks.length < 3) {
      console.log(
        '\n⚠️  Limited code splitting detected - only',
        jsChunks.length,
        'chunks',
      )
      console.log('   Consider more granular splitting for better caching')
    } else {
      console.log(
        `\n✅ Good code splitting - ${jsChunks.length} chunks for optimal caching`,
      )
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Analysis complete!\n')
  } catch (error) {
    console.error('\n❌ Error analyzing bundle:', error.message)
    console.log('\nMake sure to build the project first:')
    console.log('  pnpm build\n')
    process.exit(1)
  }
}

analyzeBundle()

