import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'dist');
const destDir = path.join(process.cwd(), 'extension-pret-a-installer');

function copyFolderRecursiveSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }

  fs.readdirSync(from).forEach((element) => {
    const srcPath = path.join(from, element);
    const destPath = path.join(to, element);

    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

try {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  
  if (fs.existsSync(srcDir)) {
    copyFolderRecursiveSync(srcDir, destDir);
    console.log('Successfully copied dist/ to extension-pret-a-installer/');
  } else {
    console.error('Source directory dist/ does not exist! Please run vite build first.');
  }
} catch (error) {
  console.error('Error copying files:', error);
}
