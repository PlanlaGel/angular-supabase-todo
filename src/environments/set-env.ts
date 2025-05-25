import * as fs from 'fs';
import * as path from 'path';

const environment = process.argv.includes('--environment=prod')
  ? 'prod'
  : 'dev';
const targetPath = path.join(
  __dirname,
  environment === 'prod' ? 'environment.prod.ts' : 'environment.ts'
);

const envConfigFile = `
export const environment = {
  production: ${environment === 'prod'},
  __NG_APP_SUPABASE_KEY__: '${process.env.__NG_APP_SUPABASE_KEY__ || ''}',
  __NG_APP_SUPABASE_URL__: '${process.env.__NG_APP_SUPABASE_URL__ || ''}',
  // Diğer hassas veriler
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`Environment file generated at ${targetPath}`);
