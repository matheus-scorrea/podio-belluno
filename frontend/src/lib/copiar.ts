export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // cai no fallback
  }

  const campo = document.createElement('textarea')
  campo.value = texto
  campo.setAttribute('readonly', '')
  campo.style.position = 'fixed'
  campo.style.left = '-9999px'
  document.body.appendChild(campo)
  campo.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(campo)
  return ok
}
