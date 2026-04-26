const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');
const logoSvg = path.resolve(publicDir, 'logo.svg');

async function generate() {
  console.log('🚀 Iniciando geração de assets PWA de alta qualidade...');

  // 1. Gerar ícones principais (Lossless)
  const sizes = [192, 512, 180]; // 180 is for Apple Touch Icon
  
  for (const size of sizes) {
    const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}x${size}.png`;
    await sharp(logoSvg)
      .resize(size, size)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(path.resolve(publicDir, filename));
    console.log(`✅ Gerado: ${filename}`);
  }

  // 2. Gerar Maskable Icon (com padding extra se necessário, mas o SVG já tem 75% logo)
  await sharp(logoSvg)
    .resize(512, 512)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.resolve(publicDir, 'maskable-icon-512x512.png'));
  console.log('✅ Gerado: maskable-icon-512x512.png');

  // 3. Gerar Splash Screen para iOS (Exemplo: 1170x2532 para iPhone 15/14/13)
  // Como o logo é um SVG quadrado, vamos centralizá-lo em um fundo #0D1F3C
  const splashWidth = 1170;
  const splashHeight = 2532;
  const logoSize = 400;

  const logoBuffer = await sharp(logoSvg)
    .resize(logoSize, logoSize)
    .toBuffer();

  await sharp({
    create: {
      width: splashWidth,
      height: splashHeight,
      channels: 4,
      background: '#0D1F3C'
    }
  })
  .composite([{ input: logoBuffer, gravity: 'center' }])
  .png()
  .toFile(path.resolve(publicDir, 'apple-splash-1170-2532.png'));
  console.log('✅ Gerado: apple-splash-1170-2532.png');

  console.log('✨ Geração concluída com sucesso!');
}

generate().catch(err => {
  console.error('❌ Erro na geração:', err);
  process.exit(1);
});
