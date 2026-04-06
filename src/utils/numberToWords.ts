export function numeroPorExtenso(numero: number): string {
  if (numero === 0) return 'zero reais';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezAteDezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function converterGrupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';

    let extenso = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
      extenso += centenas[c];
      if (d > 0 || u > 0) extenso += ' e ';
    }

    if (d === 1) {
      extenso += dezAteDezenove[u];
    } else {
      if (d > 1) {
        extenso += dezenas[d];
        if (u > 0) extenso += ' e ';
      }
      if (u > 0 && d !== 1) {
        extenso += unidades[u];
      }
    }

    return extenso;
  }

  const reais = Math.floor(numero);
  const centavos = Math.round((numero - reais) * 100);

  let resultado = '';

  if (reais > 0) {
    const milhoes = Math.floor(reais / 1000000);
    const milhares = Math.floor((reais % 1000000) / 1000);
    const resto = reais % 1000;

    let partes = [];

    if (milhoes > 0) {
      partes.push(converterGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
    }

    if (milhares > 0) {
      if (milhares === 1) {
        partes.push('mil');
      } else {
        partes.push(converterGrupo(milhares) + ' mil');
      }
    }

    if (resto > 0) {
      partes.push(converterGrupo(resto));
    }

    resultado = partes.join(' e ');
    
    if (reais === 1) {
      resultado += ' real';
    } else if (milhoes > 0 && milhares === 0 && resto === 0) {
      resultado += ' de reais';
    } else {
      resultado += ' reais';
    }
  }

  if (centavos > 0) {
    if (reais > 0) resultado += ' e ';
    resultado += converterGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  return resultado.trim();
}
