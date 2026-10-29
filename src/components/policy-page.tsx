import type { ReactNode } from "react";
import { T } from "@/components/language-provider";
import { getBusinessSettings, type PolicyKey } from "@/lib/business";

export type PolicySection = {
  heading: string;
  headingFil: string;
  paragraphs: string[];
  paragraphsFil: string[];
  bullets?: string[];
  bulletsFil?: string[];
};

export async function PolicyPage({
  title,
  titleFil,
  intro,
  introFil,
  sections,
  policyKey,
}: {
  title: string;
  titleFil: string;
  intro: string;
  introFil: string;
  sections: PolicySection[];
  policyKey: PolicyKey;
  children?: ReactNode;
}) {
  const settings = await getBusinessSettings();
  const copy = settings.policy_copy[policyKey];
  const customCopy = copy.en || copy.fil;
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Annie’s Halo Halo</span>
          <h1>
            <T en={title} fil={titleFil} />
          </h1>
          <p>
            <T en={intro} fil={introFil} />
          </p>
        </div>
      </section>
      <section className="section container policy-copy">
        <div className="form-notice">
          <T
            en="These policies explain the Shop's website process. They do not waive consumer or data privacy rights provided by applicable Philippine law."
            fil="Inilalarawan ng mga patakarang ito ang proseso ng Tindahan sa website. Hindi inaalis ng mga ito ang karapatan ng mamimili o sa privacy na ipinagkakaloob ng naaangkop na batas ng Pilipinas."
          />
        </div>
        {customCopy ? (
          <div className="policy-custom">
            <T en={copy.en || copy.fil} fil={copy.fil || copy.en} />
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.heading}>
              <h2>
                <T en={section.heading} fil={section.headingFil} />
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>
                  <T
                    en={paragraph}
                    fil={section.paragraphsFil[index] ?? paragraph}
                  />
                </p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet, index) => (
                    <li key={bullet}>
                      <T
                        en={bullet}
                        fil={section.bulletsFil?.[index] ?? bullet}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </section>
    </>
  );
}
