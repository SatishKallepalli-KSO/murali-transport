import { business, type DictKey } from '../content'

type Props = {
  tx: (key: DictKey) => string
}

export function PrivacyPortal({ tx }: Props) {
  const sections = [
    { title: tx('privacyS1Title'), body: tx('privacyS1Body') },
    { title: tx('privacyS2Title'), body: tx('privacyS2Body') },
    { title: tx('privacyS3Title'), body: tx('privacyS3Body') },
    { title: tx('privacyS4Title'), body: tx('privacyS4Body') },
    { title: tx('privacyS5Title'), body: tx('privacyS5Body') },
    { title: tx('privacyS6Title'), body: tx('privacyS6Body') },
  ]

  return (
    <section className="portal privacy-page">
      <div className="section-head">
        <h2>{tx('privacyTitle')}</h2>
        <p>{tx('privacyIntro')}</p>
      </div>
      <div className="privacy-sections">
        {sections.map((section) => (
          <article key={section.title} className="privacy-section">
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
      <p className="privacy-contact">
        {tx('privacyContact')}{' '}
        <a href={`tel:${business.phone}`}>{business.phoneDisplay}</a>
        {' · '}
        <a href={`tel:${business.phoneAlt}`}>{business.phoneAltDisplay}</a>
      </p>
      <p className="privacy-updated">{tx('privacyUpdated')}</p>
    </section>
  )
}
