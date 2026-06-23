import nodemailer, { type Transporter } from 'nodemailer';
import { MAIL_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '$app/env/private';

/**
 * Email is optional and provider-agnostic — the deployer brings their own SMTP.
 * Every email feature gates on isEmailConfigured() and is hidden when unset.
 */
export function isEmailConfigured(): boolean {
	return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM);
}

let transporter: Transporter | undefined;

function getTransport(): Transporter {
	if (!isEmailConfigured()) throw new Error('SMTP is not configured.');
	transporter ??= nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT ?? '587'),
		secure: Number(SMTP_PORT ?? '587') === 465,
		auth: { user: SMTP_USER, pass: SMTP_PASS }
	});
	return transporter;
}

export interface MailMessage {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

/** Send one email via the configured SMTP transport. Throws if not configured. */
export async function sendMail(message: MailMessage): Promise<void> {
	await getTransport().sendMail({ from: MAIL_FROM, ...message });
}
