import {
  Html,
  Body,
  Head,
  Heading,
  Container,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components';
import * as React from 'react';

// Common tailwind styles for our emails
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const box = {
  padding: '0 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  paddingBottom: '16px',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const anchor = {
  color: '#556cd6',
};

const button = {
  backgroundColor: '#000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px 0',
  marginTop: '24px',
  marginBottom: '24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '12px',
};

// -----------------------------------------------------------
// NEW REVISION EMAIL
// -----------------------------------------------------------

interface NewRevisionEmailProps {
  projectName: string;
  projectUrl: string;
  unsubscribeUrl?: string; // Optional for anonymous users
}

export const NewRevisionEmail = ({
  projectName = "Your Project",
  projectUrl = "https://design-portal.polyunity.com",
  unsubscribeUrl,
}: NewRevisionEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>A new revision was uploaded to {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={h1}>New Revision Uploaded</Heading>
            <Text style={text}>
              A new revision for the project <strong>{projectName}</strong> is now available for review.
            </Text>
            <Link href={projectUrl} style={button}>
              View Design
            </Link>
            
            <hr style={hr} />
            
            <Text style={footer}>
              You are receiving this email because you opted into revision notifications for this project.
              {unsubscribeUrl && (
                <>
                  {' '}If you'd like to stop receiving these emails, you can{' '}
                  <Link href={unsubscribeUrl} style={anchor}>
                    unsubscribe here
                  </Link>.
                </>
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// -----------------------------------------------------------
// NEW COMMENT EMAIL
// -----------------------------------------------------------

interface NewCommentEmailProps {
  projectName: string;
  authorName: string;
  commentContent: string;
  projectUrl: string;
  unsubscribeUrl?: string; // Optional for anonymous users
}

export const NewCommentEmail = ({
  projectName = "Your Project",
  authorName = "A team member",
  commentContent = "Left a comment.",
  projectUrl = "https://design-portal.polyunity.com",
  unsubscribeUrl,
}: NewCommentEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>New comment from {authorName} on {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={h1}>New Comment</Heading>
            <Text style={text}>
              <strong>{authorName}</strong> left a new comment on the project <strong>{projectName}</strong>:
            </Text>
            
            <Section style={{ padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', margin: '16px 0' }}>
              <Text style={{ ...text, margin: 0 }}>"{commentContent}"</Text>
            </Section>

            <Link href={projectUrl} style={button}>
              View in Portal
            </Link>
            
            <hr style={hr} />
            
            <Text style={footer}>
              {unsubscribeUrl ? (
                <>
                  You requested to be notified of all comments on this project. To stop receiving these emails,{' '}
                  <Link href={unsubscribeUrl} style={anchor}>
                    unsubscribe here
                  </Link>.
                </>
              ) : (
                "This notification was sent to the designated project email address."
              )}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
