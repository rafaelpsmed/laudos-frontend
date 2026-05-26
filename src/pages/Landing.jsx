import { Link } from 'react-router-dom';
import {
  IconFileText,
  IconQuote,
  IconVariable,
  IconReport,
  IconBrain,
} from '@tabler/icons-react';
import styles from './Landing.module.css';
import { H2Control } from '@mantine/tiptap';

const features = [
  {
    icon: IconFileText,
    title: 'Modelos reutilizáveis',
    text: 'Estruture laudos com modelos que você edita uma vez e aplica sempre que precisar.',
  },
  {
    icon: IconQuote,
    title: 'Frases inteligentes',
    text: 'Monte trechos padronizados e combine-os para ganhar velocidade sem perder consistência.',
  },
  {
    icon: IconVariable,
    title: 'Variáveis dinâmicas',
    text: 'Monte frases com variáveis que você pode editar e reutilizar em qualquer lugar.',
  },
  {
    icon: IconReport,
    title: 'Laudos em alguns cliques',
    text: 'Gere saída pronta para revisão e entrega no fluxo que você já usa no dia a dia.',
  },
  {
    icon: IconFileText,
    title: 'Customização',
    text: 'Crie Modelos, Frases e Variáveis personalizadas para atender às suas necessidades. Você tem o controle total sobre o seu laudo.',
  },
  {
    icon: IconBrain,
    title: 'Apoio com IA',
    text: 'Use assistência onde o sistema oferecer para acelerar redação e revisão.',
  },
];

export default function Landing() {
  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} aria-hidden />
      <div className={styles.gridOverlay} aria-hidden />

      <header className={styles.header}>
        <span className={styles.logo}>LaudEx</span>
        <nav className={styles.nav}>
          <Link className={styles.link} to="/login">
            Entrar
          </Link>
          {/* <Link className={styles.ctaPrimary} to="/register">
            Criar conta
          </Link> */}
        </nav>
      </header>

      <section className={styles.hero}>
        {/* <p className={styles.badge}>
          <span className={styles.badgeDot} />
          Fluxo clínico moderno
        </p> */}
        <h1 className={styles.title}>
          LaudEx
        </h1>
        {/* <h3 className={styles.title}>
          Laudos médicos com{' '}
          <span className={styles.titleAccent}>precisão e ritmo</span>
        </h3> */}
        <p className={styles.subtitle}>
          Uma plataforma para organizar modelos, frases e variáveis — do rascunho ao documento
          final, com visual limpo e pensado para o cotidiano da radiologia e especialidades
          correlatas.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.btnMain} to="/login">
            Acessar o sistema
          </Link>
          {/* <Link className={styles.btnGhost} to="/register">
            Criar uma conta
          </Link> */}
        </div>
      </section>

      <section className={styles.features} aria-labelledby="features-heading">
        <p id="features-heading" className={styles.sectionLabel}>
          O que você encontra aqui
        </p>
        <div className={styles.cardGrid}>
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className={styles.card}>
              <div className={styles.cardIcon}>
                <Icon size={22} stroke={1.5} />
              </div>
              <h2 className={styles.cardTitle}>{title}</h2>
              <p className={styles.cardText}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.sectionLabel}>
          Comece agora mesmo
        </h2>
        
        <p className={styles.cta}>
          Crie sua conta e comece a usar a plataforma agora mesmo. Você terá acesso imediato a mais de 50 modelos de laudos de todos os métodos e mais de 400 frases e variáveis já cadastradas.
          Não gostou de um modelo ou frase? Você pode editar ou criar a sua própria e usá-la em qualquer lugar.
          Não encontrou o modelo ou frase que você precisa? Você pode criar a sua própria e usá-la em qualquer lugar.
          Aqui a liberdade é total. Você tem o controle total sobre o seu laudo.
        </p>

      </section>

      <footer className={styles.footer}>
        LaudEx — ferramenta de apoio à documentação clínica.
      </footer>
    </div>
  );
}
