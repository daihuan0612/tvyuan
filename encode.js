// encode.js - 将JSON配置文件转换为Base58编码文本文件
const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const JINGJIAN_PATH = path.join(__dirname, 'jingjian.json');
const JIN18_PATH = path.join(__dirname, 'jin18.json');

// 输出文件路径
const CONFIG_TXT_PATH = path.join(__dirname, 'LunaTV-config.txt');
const JINGJIAN_TXT_PATH = path.join(__dirname, 'jingjian.txt');
const JIN18_TXT_PATH = path.join(__dirname, 'jin18.txt');

// Base58 编码函数
function base58Encode(obj) {
  const str = JSON.stringify(obj);
  return bs58.encode(Buffer.from(str, 'utf8'));
}

try {
  // 编码主配置文件
  if (fs.existsSync(CONFIG_PATH)) {
    const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const encodedConfig = base58Encode(configData);
    fs.writeFileSync(CONFIG_TXT_PATH, encodedConfig, 'utf8');
    console.log(`✅ LunaTV-config.json 已编码为 Base58 并保存到 ${CONFIG_TXT_PATH}`);
  }

  // 编码精简版配置文件
  if (fs.existsSync(JINGJIAN_PATH)) {
    const jingjianData = JSON.parse(fs.readFileSync(JINGJIAN_PATH, 'utf8'));
    const encodedJingjian = base58Encode(jingjianData);
    fs.writeFileSync(JINGJIAN_TXT_PATH, encodedJingjian, 'utf8');
    console.log(`✅ jingjian.json 已编码为 Base58 并保存到 ${JINGJIAN_TXT_PATH}`);
  }

  // 编码18+过滤版配置文件
  if (fs.existsSync(JIN18_PATH)) {
    const jin18Data = JSON.parse(fs.readFileSync(JIN18_PATH, 'utf8'));
    const encodedJin18 = base58Encode(jin18Data);
    fs.writeFileSync(JIN18_TXT_PATH, encodedJin18, 'utf8');
    console.log(`✅ jin18.json 已编码为 Base58 并保存到 ${JIN18_TXT_PATH}`);
  }

  console.log('🎉 所有文件编码完成！');
} catch (error) {
  console.error('❌ 编码过程中出错:', error.message);
  process.exit(1);
}