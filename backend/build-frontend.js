const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running: ${command}`);
    console.log(`📁 In directory: ${cwd}`);
    
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (stdout) console.log('📤 Output:', stdout);
      if (stderr) console.log('⚠️  Error output:', stderr);
      
      if (error) {
        console.log('❌ Command failed:', error.message);
        reject(error);
      } else {
        console.log('✅ Command completed successfully');
        resolve({ stdout, stderr });
      }
    });
  });
}

async function buildFrontend() {
  try {
    console.log('=== Starting Node.js Frontend Build Process ===');
    console.log('📁 Current directory:', process.cwd());
    console.log('📁 __dirname:', __dirname);

    const frontendDir = path.join(__dirname, '..', 'frontend');
    console.log('📁 Frontend directory:', frontendDir);

    // Check if frontend directory exists
    if (!fs.existsSync(frontendDir)) {
      throw new Error(`Frontend directory does not exist: ${frontendDir}`);
    }

    console.log('📂 Frontend directory contents:');
    const frontendContents = fs.readdirSync(frontendDir);
    console.log('   ', frontendContents.join(', '));

    // Install frontend dependencies
    console.log('\n=== Installing Frontend Dependencies ===');
    await runCommand('npm install', frontendDir);

    // Build frontend
    console.log('\n=== Building React Application ===');
    await runCommand('npm run build', frontendDir);

    // Check if build directory was created
    const buildDir = path.join(frontendDir, 'build');
    console.log('\n=== Checking Build Results ===');
    console.log('📁 Expected build directory:', buildDir);

    if (fs.existsSync(buildDir)) {
      console.log('✅ Build directory found!');
      const buildContents = fs.readdirSync(buildDir);
      console.log('📂 Build directory contents:', buildContents.join(', '));

      // Copy build directory to backend
      const backendBuildDir = path.join(__dirname, 'build');
      console.log('\n=== Copying Build Files ===');
      console.log('📁 Copying from:', buildDir);
      console.log('📁 Copying to:', backendBuildDir);

      // Remove existing build directory if it exists
      if (fs.existsSync(backendBuildDir)) {
        fs.rmSync(backendBuildDir, { recursive: true, force: true });
      }

      // Copy the build directory
      fs.cpSync(buildDir, backendBuildDir, { recursive: true });
      
      console.log('✅ Build files copied successfully!');
      
      // Verify the copy
      if (fs.existsSync(backendBuildDir)) {
        const copiedContents = fs.readdirSync(backendBuildDir);
        console.log('📂 Backend build directory contents:', copiedContents.join(', '));
        
        const indexPath = path.join(backendBuildDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          console.log('✅ index.html found in backend build directory');
        } else {
          console.log('❌ index.html NOT found in backend build directory');
        }
      }
    } else {
      throw new Error('Build directory was not created after npm run build');
    }

    console.log('\n=== Frontend Build Process Completed Successfully! ===');
  } catch (error) {
    console.error('❌ Frontend build process failed:', error.message);
    process.exit(1);
  }
}

buildFrontend();