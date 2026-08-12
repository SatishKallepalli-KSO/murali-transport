import { PhoneLinks } from '../components/PhoneLinks'
import { waHref } from '../lib/whatsapp'
import { address, business, type DictKey, type Lang } from '../content'

type Props = {
  lang: Lang
  tx: (key: DictKey) => string
}

export function AboutPortal({ lang, tx }: Props) {
  return (
    <section className="portal about-page">
      <div className="section-head">
        <h2>{tx('aboutTitle')}</h2>
        <p>{tx('aboutIntro')}</p>
      </div>
      <div className="about-layout">
        <div className="about-card">
          <dl className="about-facts">
            <div>
              <dt>{tx('aboutOwnerLabel')}</dt>
              <dd>{business.owner}</dd>
            </div>
            <div>
              <dt>{tx('aboutPhoneLabel')}</dt>
              <dd>
                <PhoneLinks />
              </dd>
            </div>
            <div>
              <dt>{tx('aboutAddressLabel')}</dt>
              <dd>{address.line}</dd>
            </div>
            <div>
              <dt>{tx('aboutHoursLabel')}</dt>
              <dd>{tx('aboutHoursValue')}</dd>
            </div>
            <div>
              <dt>Google</dt>
              <dd>
                <a href={business.mapsShareUrl} target="_blank" rel="noreferrer">
                  {business.rating}★ · {business.reviewCount} {tx('googleReviews')}
                </a>
              </dd>
            </div>
          </dl>
          <p className="about-body">{tx('aboutBody')}</p>
          <div className="location-actions">
            <a className="btn btn-primary" href={`tel:${business.phone}`}>
              {tx('callNow')}
            </a>
            <a className="btn btn-ghost" href={waHref(lang)} target="_blank" rel="noreferrer">
              {tx('whatsapp')}
            </a>
            <a className="btn btn-ghost" href={business.mapsShareUrl} target="_blank" rel="noreferrer">
              {tx('ctaDirections')}
            </a>
          </div>
        </div>
        <div className="about-map">
          <p className="about-map-label">{tx('aboutMapTitle')}</p>
          <iframe
            title={tx('aboutMapTitle')}
            src={business.mapsEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
