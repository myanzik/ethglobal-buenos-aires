const fs = require('fs');
const path = require('path');

/**
 * Generate Standard JSON Input files from Hardhat build-info files
 * These can be used for manual contract verification on block explorers
 * 
 * Usage: node scripts/generate-standard-json.cjs
 */

const BUILD_INFO_DIR = path.join(__dirname, '../artifacts/build-info');
const OUTPUT_DIR = path.join(__dirname, 'standard-json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function getAllBuildInfoFiles() {
  if (!fs.existsSync(BUILD_INFO_DIR)) {
    console.error('Build info directory not found. Please run "pnpm compile" first.');
    process.exit(1);
  }

  const files = fs.readdirSync(BUILD_INFO_DIR);
  // Filter for build-info files (not output files)
  return files.filter(file => 
    file.endsWith('.json') && 
    !file.endsWith('.output.json') &&
    file.startsWith('solc-')
  );
}

function extractContractNames(buildInfo) {
  const contracts = [];
  
  if (buildInfo.userSourceNameMap) {
    Object.keys(buildInfo.userSourceNameMap).forEach(sourceName => {
      // Extract contract name from source path
      // e.g., "contracts/issue-tracker.sol" -> "IssueTracker"
      const fileName = path.basename(sourceName, '.sol');
      // Convert kebab-case to PascalCase
      const contractName = fileName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
      contracts.push({
        sourceName,
        contractName,
        fileName
      });
    });
  }
  
  return contracts;
}

function generateStandardJson() {
  console.log('🔍 Scanning build-info files...\n');
  
  const buildInfoFiles = getAllBuildInfoFiles();
  
  if (buildInfoFiles.length === 0) {
    console.error('No build-info files found. Please run "pnpm compile" first.');
    process.exit(1);
  }

  console.log(`Found ${buildInfoFiles.length} build-info file(s)\n`);

  let totalGenerated = 0;

  buildInfoFiles.forEach(buildInfoFile => {
    const buildInfoPath = path.join(BUILD_INFO_DIR, buildInfoFile);
    
    try {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      
      if (!buildInfo.input) {
        console.warn(`⚠️  No input field found in ${buildInfoFile}, skipping...`);
        return;
      }

      // Extract contract information
      const contracts = extractContractNames(buildInfo);
      
      if (contracts.length === 0) {
        // If no specific contracts, use the build-info ID as filename
        const outputFile = path.join(OUTPUT_DIR, `${buildInfo.id}.json`);
        fs.writeFileSync(
          outputFile,
          JSON.stringify(buildInfo.input, null, 2)
        );
        console.log(`✅ Generated: ${path.basename(outputFile)}`);
        totalGenerated++;
      } else {
        // Generate one file per contract
        contracts.forEach(({ contractName, fileName }) => {
          const outputFile = path.join(OUTPUT_DIR, `${contractName}.json`);
          fs.writeFileSync(
            outputFile,
            JSON.stringify(buildInfo.input, null, 2)
          );
          console.log(`✅ Generated: ${contractName}.json (from ${fileName}.sol)`);
          totalGenerated++;
        });
      }
    } catch (error) {
      console.error(`❌ Error processing ${buildInfoFile}:`, error.message);
    }
  });

  console.log(`\n✨ Generated ${totalGenerated} standard JSON file(s) in ${OUTPUT_DIR}/`);
  console.log('\n📝 Usage for verification:');
  console.log('   You can upload these files to block explorers for manual verification.');
  console.log('   - BaseScan: https://sepolia.basescan.org/verifyContract');
  console.log('   - Blockscout: https://base-sepolia.blockscout.com/contracts/verify');
  console.log('   - Sourcify: https://sourcify.dev/');
}

// Run the script
generateStandardJson();

