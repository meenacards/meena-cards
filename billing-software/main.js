const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

function getLogoDataUri() {
	try {
		const logoPath = path.join(__dirname, 'public', 'logo.png');
		if (!fs.existsSync(logoPath)) return '';
		const base64 = fs.readFileSync(logoPath).toString('base64');
		return `data:image/png;base64,${base64}`;
	} catch (_error) {
		return '';
	}
}

const LOGO_DATA_URI = getLogoDataUri();

function createTempHtmlFile(html) {
	const tempDir = app.getPath('temp');
	const tempFile = path.join(tempDir, `meena-invoice-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
	fs.writeFileSync(tempFile, html, 'utf8');
	return tempFile;
}

function safeDeleteFile(filePath) {
	if (!filePath) return;
	try {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	} catch (_error) {
		// Ignore cleanup failures.
	}
}

function loadEnvFromFile() {
	// Try multiple locations: dev directory, then app resources (production build)
	const possiblePaths = [
		path.join(__dirname, '.env'),  // Dev environment
		path.join(app.getAppPath(), '.env'),  // Built app in resources
	];

	let envPath;
	for (const p of possiblePaths) {
		if (fs.existsSync(p)) {
			envPath = p;
			break;
		}
	}

	if (!envPath) {
		console.warn('No .env file found in dev or app resources');
		return;
	}

	try {
		const content = fs.readFileSync(envPath, 'utf8');
		content.split(/\r?\n/).forEach((line) => {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) return;

			const eqIndex = trimmed.indexOf('=');
			if (eqIndex <= 0) return;

			const key = trimmed.slice(0, eqIndex).trim();
			let value = trimmed.slice(eqIndex + 1).trim();

			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}

			if (!process.env[key]) {
				process.env[key] = value;
			}
		});
	} catch (error) {
		console.warn('Failed to read .env file:', error.message || error);
	}
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function buildInvoicePrintHtml(invoice) {
	const rows = (invoice.items || [])
		.map((item) => `
			<tr>
				<td>${escapeHtml(item.name)}</td>
				<td style="text-align:right;">${Number(item.quantity || 0)}</td>
				<td style="text-align:right;">Rs. ${Number(item.price || 0).toFixed(2)}</td>
				<td style="text-align:right;">Rs. ${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
			</tr>
		`)
		.join('');

	return `
		<!doctype html>
		<html>
			<head>
				<meta charset="utf-8" />
				<title>Invoice ${escapeHtml(invoice.invoice_number || '')}</title>
				<style>
					body { font-family: Arial, sans-serif; margin: 0; color: #222; }
					.page {
						position: relative;
						min-height: 100%;
						padding: 4mm;
						overflow: hidden;
					}
					.watermark {
						position: absolute;
						left: 50%;
						top: 50%;
						transform: translate(-50%, -50%);
						display: flex;
						align-items: center;
						justify-content: center;
						opacity: 0.12;
						z-index: 1;
						pointer-events: none;
					}
					.watermark img {
						width: 240px;
						height: 240px;
						object-fit: contain;
					}
					.content {
						position: relative;
						z-index: 2;
					}
					h1 { margin: 0 0 8px; font-size: 20px; }
					.meta { margin-bottom: 10px; font-size: 12px; color: #555; }
					table { width: 100%; border-collapse: collapse; margin-top: 8px; }
					th, td { border-bottom: 1px solid #ddd; padding: 6px; font-size: 12px; }
					th { text-align: left; background: #f7f7f7; }
					.totals { margin-top: 12px; width: 280px; margin-left: auto; }
					.totals-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
					.grand { font-weight: bold; font-size: 14px; }
				</style>
			</head>
			<body>
				<div class="page">
					<div class="watermark">${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="Meena Cards"/>` : ''}</div>
					<div class="content">
						<h1>Meena Cards - Invoice</h1>
						<div class="meta">Invoice #${escapeHtml(invoice.invoice_number || '')}<br/>Date: ${new Date(invoice.created_at || Date.now()).toLocaleString()}</div>
						<table>
							<thead>
								<tr>
									<th>Item</th>
									<th style="text-align:right;">Qty</th>
									<th style="text-align:right;">Price</th>
									<th style="text-align:right;">Amount</th>
								</tr>
							</thead>
							<tbody>${rows}</tbody>
						</table>
						<div class="totals">
							<div class="totals-row"><span>Subtotal</span><span>Rs. ${Number(invoice.subtotal || 0).toFixed(2)}</span></div>
							<div class="totals-row"><span>Tax</span><span>Rs. ${Number(invoice.tax || 0).toFixed(2)}</span></div>
							<div class="totals-row grand"><span>Total</span><span>Rs. ${Number(invoice.total_amount || 0).toFixed(2)}</span></div>
						</div>
					</div>
				</div>
			</body>
		</html>
	`;
}

function printInvoice(invoice, options = {}) {
	return new Promise((resolve) => {
		const hiddenWin = new BrowserWindow({
			width: 820,
			height: 1160,
			show: false,
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
			},
		});

		const tempHtmlPath = createTempHtmlFile(buildInvoicePrintHtml(invoice));

		hiddenWin.webContents.once('did-finish-load', () => {
			hiddenWin.webContents.print(
				{
					silent: options.silent !== false,
					printBackground: true,
					pageSize: options.pageSize || 'A5',
					margins: options.margins || { marginType: 'none' },
					deviceName: options.deviceName || undefined,
				},
				(success, errorType) => {
					hiddenWin.close();
					safeDeleteFile(tempHtmlPath);
					if (!success) {
						resolve({ ok: false, error: errorType || 'Print failed' });
						return;
					}
					resolve({ ok: true });
				}
			);
		});

		hiddenWin.loadFile(tempHtmlPath).catch((error) => {
			hiddenWin.close();
			safeDeleteFile(tempHtmlPath);
			resolve({ ok: false, error: error.message || 'Failed to load invoice print template' });
		});
	});
}

function saveInvoicePdf(invoice, filename, options = {}) {
	return new Promise((resolve) => {
		const hiddenWin = new BrowserWindow({
			width: 820,
			height: 1160,
			show: false,
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
			},
		});

		const tempHtmlPath = createTempHtmlFile(buildInvoicePrintHtml(invoice));

		hiddenWin.webContents.once('did-finish-load', async () => {
			try {
				await hiddenWin.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)');
				await hiddenWin.webContents.executeJavaScript('new Promise((resolve) => requestAnimationFrame(() => resolve(true)))');
				const pdfData = await hiddenWin.webContents.printToPDF({
					pageSize: 'A5',
					preferCSSPageSize: false,
					printBackground: true,
					margins: { top: 0, bottom: 0, left: 0, right: 0 },
				});

				// Save to Downloads folder
				const downloadsPath = path.join(os.homedir(), 'Downloads');
				const filepath = path.join(downloadsPath, filename);
				
				fs.writeFile(filepath, pdfData, (err) => {
					hiddenWin.close();
					safeDeleteFile(tempHtmlPath);
					if (err) {
						console.error('Failed to save PDF:', err);
						resolve({ ok: false, error: 'Failed to save PDF' });
					} else {
						resolve({ ok: true, path: filepath });
					}
				});
			} catch (err) {
				console.error('Failed to convert to PDF:', err);
				hiddenWin.close();
				safeDeleteFile(tempHtmlPath);
				resolve({ ok: false, error: err.message });
			}
		});

		hiddenWin.loadFile(tempHtmlPath).catch((error) => {
			hiddenWin.close();
			safeDeleteFile(tempHtmlPath);
			resolve({ ok: false, error: error.message || 'Failed to load invoice PDF template' });
		});
	});
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 800,
		autoHideMenuBar: true,
		icon: path.join(__dirname, 'public', 'icons', 'icon.ico'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	Menu.setApplicationMenu(null);
	mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
	loadEnvFromFile();  // Load .env after app is ready
	app.setAppUserModelId('com.meenacards.billing');

	ipcMain.handle('app:refresh', () => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.reload();
		}
		return { ok: true };
	});

	ipcMain.handle('app:exit', () => {
		app.quit();
		return { ok: true };
	});

	ipcMain.handle('print:invoice', async (_event, payload) => {
		try {
			return await printInvoice(payload.invoice, payload.options || {});
		} catch (error) {
			return { ok: false, error: error.message || 'Print error' };
		}
	});

	ipcMain.handle('pdf:download', async (_event, payload) => {
		try {
			return await saveInvoicePdf(payload.invoice, payload.filename, payload.options || {});
		} catch (error) {
			return { ok: false, error: error.message || 'PDF save error' };
		}
	});

	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});


