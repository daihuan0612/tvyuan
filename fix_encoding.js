const fs = require('fs');
const path = require('path');

// 修复JSON文件编码问题
const jsonFiles = ['jin18.json', 'jingjian.json', 'LunaTV-config.json'];

jsonFiles.forEach(fileName => {
  const filePath = path.join(__dirname, fileName);
  
  if (fs.existsSync(filePath)) {
    try {
      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 写回文件，确保使用正确的UTF-8编码
      fs.writeFileSync(filePath, content, 'utf8');
      
      console.log(`✓ Fixed encoding for ${fileName}`);
    } catch (error) {
      console.error(`✗ Failed to fix encoding for ${fileName}:`, error.message);
    }
  } else {
    console.log(`⚠ File not found: ${fileName}`);
  }
});

console.log('Encoding fix completed.');