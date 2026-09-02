// The "Want to know Jesus?" page.
//
// A server component: the church details are read at build time from
// church.json, so the page ships as plain HTML with nothing to fetch and
// nothing to wait for. Change church.json, redeploy, done.
//
// Anything the church has not given us yet renders as "To come" rather than a
// guess. Never put an invented service time on a real church's page.
//
// See README.md for where each file goes.

import church from '@/content/church.json';
import Link from "next/link";
import { Mark, ArrowLeft } from "@/components/know-jesus/marks";

export const metadata = {
  title: 'Want to know Jesus? — Heaven’s Harvest Pantry',
  description:
    'A page about faith, and an open invitation to the church our family goes to. Nothing on it is for sale.',
};

function Pending({ label }: { label: string }) {
  return <span className="pending">{label}</span>;
}

export default function KnowJesus() {
  // Her family's own campus is listed first and marked. The other one still
  // shows in full: this is an invitation, not a redirect.
  const campuses = [...church.campuses].sort(
    (a, b) => Number(b.id === church.homeCampus) - Number(a.id === church.homeCampus)
  );

  const checkedOn = new Date(church.verifiedOn + 'T12:00:00').toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="kj">
      <div className="wrap">
        <div className="top">
          <Link className="wordmark" href="/">Heaven&rsquo;s Harvest Pantry</Link>
          <Link className="back" href="/"><ArrowLeft /> Back to the granola</Link>
        </div>
      </div>

      <main>
        <div className="wrap">
          <section className="hero">
            <div>
              <p className="eyebrow">No pressure, no pitch</p>
              <h1 className="display">Want to know Jesus?</h1>
              <p className="lede">
                Then this page is the whole of it. We are a family that bakes granola in a
                home kitchen, and we follow Jesus. If you have questions, or you are looking
                for a church, or you just want somebody to sit next to on a Sunday, there is
                a seat for you and we will meet you at the door.
              </p>
            </div>
            <div className="mark" aria-hidden="true"><Mark size={112} /></div>
          </section>

          <section className="three">
            <div>
              <h2>It is not a performance</h2>
              <p>
                You do not need to clean yourself up first, know the songs, or have the
                answers. Nobody in the room has them either. You are welcome exactly as you
                are today.
              </p>
            </div>
            <div>
              <h2>It is being there for people</h2>
              <p>
                Most of what following Jesus looks like day to day is showing up: meals when
                somebody is sick, a hand when somebody moves, sitting with people through the
                hard weeks. That is the job, and it is most of it.
              </p>
            </div>
            <div>
              <h2>And telling the good news</h2>
              <p>
                The other half is saying out loud why we do it. Jesus came, died and rose so
                that anybody who wants to come home can. That is the news, and it was always
                meant to be shared rather than kept.
              </p>
            </div>
          </section>
        </div>

        <section className="church">
          <div className="wrap church-grid">
            <div>
              <p className="eyebrow" style={{ color: 'var(--muted)' }}>Where our family goes</p>
              <h2>{church.name}</h2>
              <p className="say">
                It is our home church here in the north valley, and it is where our family is
                on a Sunday. We are not asking you to leave anywhere. If you already have a
                church, good. If you do not, or you are between churches, or you have not set
                foot in one in twenty years, come and sit with us once and see what you think.
              </p>
              <div className="actions">
                <a className="btn" href={church.planVisitUrl ?? church.website}>Plan a visit</a>
                <a className="btn ghost" href="#write">Come with us this Sunday</a>
              </div>
              <p className="fine" style={{ maxWidth: '34em' }}>
                &ldquo;Come with us&rdquo; sends her a short note. She writes back, and you
                walk in beside somebody you have already met. That is the whole of the feature.
              </p>
            </div>

            <aside className="aside">
              <h3>Where and when</h3>
              <div style={{ marginTop: 6 }}>
                {campuses.map((c) => (
                  <div className={c.id === church.homeCampus ? 'campus is-home' : 'campus'} key={c.id}>
                    <h4>{c.name}</h4>
                    {c.id === church.homeCampus ? <p className="home">Where our family is</p> : null}
                    {c.near ? <p className="near">{c.near}</p> : null}
                    <p className="addr">
                      {c.address ? (
                        <>
                          {c.address}
                          {c.mapUrl ? <> &middot; <a href={c.mapUrl}>map</a></> : null}
                        </>
                      ) : (
                        <Pending label="Address to come" />
                      )}
                    </p>
                    {c.services.map((sv) => (
                      <div className="times" key={sv.day}>
                        <span className="day">{sv.day}</span>
                        <span className="dots" />
                        {sv.times ? <span className="val">{sv.times}</span> : <Pending label="To come" />}
                      </div>
                    ))}
                    <p className="kidsline">
                      Kids: {c.kids ?? <Pending label="Ages to come" />}
                    </p>
                    {c.whichDoor ? <p className="kidsline">{c.whichDoor}</p> : null}
                  </div>
                ))}
              </div>

              <div className="gap">
                {church.online?.times ? (
                  <p className="elsewhere">
                    <strong>{church.online.label}</strong> &mdash; {church.online.times}
                    {church.online.url ? <> &middot; <a href={church.online.url}>watch</a></> : null}
                  </p>
                ) : null}
                {church.espanol?.times ? (
                  <p className="elsewhere">
                    <strong>{church.espanol.label}</strong> &mdash; {church.espanol.times}
                  </p>
                ) : null}
              </div>

              <p
                className="fine"
                style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #c2b393' }}
              >
                Checked against their own site on {checkedOn}. Times can change at Christmas
                and Easter, so <a href={church.website}>check pureheart.org</a> before you set out.
              </p>
            </aside>
          </div>
        </section>

        <div className="wrap">
          <section className="two">
            <div className="quiet" id="write">
              <p className="eyebrow" style={{ color: 'var(--muted)' }}>
                If a building is too much right now
              </p>
              <h2>Just write to us instead</h2>
              <p>
                A private line straight to her. Ask anything, or send something you would like
                prayed over. Nobody else sees it, it never appears on the site, and it is never
                added to a mailing list.
              </p>
              <div className="actions">
                <a className="btn ghost" href="/write">Write privately</a>
              </div>
            </div>
            <div>
              <p className="verse bigverse">
                &ldquo;Let us consider how we may spur one another on toward love and good
                deeds, not giving up meeting together&hellip; but encouraging one another.&rdquo;
              </p>
              <p className="ref" style={{ marginTop: 16 }}>Hebrews 10:24&ndash;25</p>
              <p className="after">
                That verse is why this page exists at all. Not to sell anybody anything &mdash;
                there is nothing to buy on it &mdash; but because a granola company run out of a
                kitchen is a small way of doing exactly what it describes.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
