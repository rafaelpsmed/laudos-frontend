// pluralize.js
export default function pluralize(text) {
    // Lista de exceções específicas
    const exceptions = {
      "cão": "cães",
      "pão": "pães",
      "mão": "mãos",
      "alemão": "alemães",
      "capitão": "capitães",
      "charlatão": "charlatães",
      "cidadão": "cidadãos",
      "irmão": "irmãos",
      "tabelião": "tabeliães",
      "zângão": "zângãos",
      "capuz": "capuzes",
      "giz": "gizes",
      "lápis": "lápis", // invariável
      "ônibus": "ônibus", // invariável
      "país": "países",
      "deus": "deuses",
      "luz": "luzes",
      "mês": "meses",
      "revés": "reveses",
      "ás": "ases",
      "cortês": "corteses",
      "inglês": "ingleses",
      "interesse": "interesses",
      "gás": "gases",
      "hall": "halls",
      "álcool": "álcoois",
      "anzol": "anzóis",
      "cal": "cales",
      "fel": "feles",
      "mal": "males",
      "mel": "meles",
      "sol": "soles",
      "aval": "avais",
      "coral": "corais",
      "funil": "funis",
      "fuzil": "fuzis",
      "paul": "pauis",
      "pastel": "pasteis",
      "varal": "varais",
      "animal": "animais",
      "de": "de",
      "deu": "deu",
      "assim": "assim",
      "acima": "acima",
      "abaixo": "abaixo",
      "além": "além",
      "dentro": "dentro",
      "fora": "fora",
      "junto": "junto",
      "-":"-",
      


    };
  
    // Função para pluralizar uma única palavra
    function pluralizeWord(word) {
      // Verifica se a palavra está na lista de exceções
      if (exceptions[word]) {
        return exceptions[word];
      }
    
      // Regras gerais de pluralização
      if (word.endsWith("r") || word.endsWith("s") || word.endsWith("z")) {
        return word + "es"; // Ex.: flor -> flores, mês -> meses, luz -> luzes
      } 
      else if (word.endsWith("al") || word.endsWith("el") || word.endsWith("ol") || word.endsWith("ul")) {
        return word.slice(0, -1) + "is"; // Ex.: canal -> canais, papel -> papéis
      } 
      else if (word.endsWith("il")) {
        // Verifica a vogal anterior para decidir entre "is" e "eis"
        if (word.length > 2 && ["a", "e", "o", "u"].includes(word.charAt(word.length - 3))) {
          return word.slice(0, -2) + "is"; // Ex.: funil -> funis
        } else {
          return word.slice(0, -2) + "eis"; // Ex.: civil -> civis
        }
      } 
      else if (word.endsWith("m")) {
        return word.slice(0, -1) + "ns"; // Ex.: som -> sons
      } 
      else if (word.endsWith("ão")) {
        return word.slice(0, -2) + "ões"; // Ex.: nação -> nações
      } 
      else {
        return word + "s"; // Regra padrão: Ex.: gato -> gatos
      }
    }

    // Divide o texto em palavras e pluraliza cada uma
    return text.split(/\s+/).map(word => {
      // Remove pontuação do final da palavra
      const punctuation = word.match(/[.,;:!?]$/);
      const cleanWord = punctuation ? word.slice(0, -1) : word;
      
      // Pluraliza a palavra
      const pluralizedWord = pluralizeWord(cleanWord);
      
      // Retorna a palavra pluralizada com a pontuação original
      return punctuation ? pluralizedWord + punctuation : pluralizedWord;
    }).join(' ');
}