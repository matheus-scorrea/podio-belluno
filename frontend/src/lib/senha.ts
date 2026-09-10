export const SENHA_REQUISITOS = 'Mínimo de 8 caracteres, com letra maiúscula, minúscula e número.'

export function senhaAtendeRegras(senha: string): boolean {
  return senha.length >= 8 && /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /\d/.test(senha)
}
