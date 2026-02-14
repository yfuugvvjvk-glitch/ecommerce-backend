import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL trebuie să fie un URL valid'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET trebuie să aibă minim 32 caractere'),
  
  // Server
  PORT: z.string().optional().default('3001').transform(val => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  
  // CORS
  CORS_ORIGIN: z.string().optional().default('http://localhost:3000'),
  
  // OpenAI (opțional)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional().default('gpt-4o-mini'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Variabilele de mediu validate cu succes');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Erori la validarea variabilelor de mediu:');
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    throw new Error('Validarea variabilelor de mediu a eșuat');
  }
}
