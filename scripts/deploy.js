import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const deploy = async () => {
  try {
    console.log('Iniciando processo de deploy...');
    
    // Verifica se o diretório dist existe
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      console.error('Diretório dist não encontrado. Execute npm run build primeiro.');
      process.exit(1);
    }

    // Aqui você pode adicionar comandos específicos para seu servidor
    // Por exemplo, usando scp para copiar os arquivos:
    // execSync('scp -r dist/* usuario@servidor:/caminho/do/servidor');

    console.log('Deploy concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o deploy:', error);
    process.exit(1);
  }
};

deploy(); 