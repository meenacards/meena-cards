const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

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
				<title>Invoice ${escapeHtml(invoice.invoice_id || '')}</title>
				<style>
					body { font-family: Arial, sans-serif; margin: 18px; color: #222; }
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
				<h1>Meena Cards - Invoice</h1>
				<div class="meta">Invoice ID: ${escapeHtml(invoice.invoice_id || '')}<br/>Date: ${new Date(invoice.created_at || Date.now()).toLocaleString()}</div>
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
			</body>
		</html>
	`;
}

function printInvoice(invoice, options = {}) {
	return new Promise((resolve) => {
		const hiddenWin = new BrowserWindow({
			show: false,
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
			},
		});

		hiddenWin.webContents.once('did-finish-load', () => {
			hiddenWin.webContents.print(
				{
					silent: options.silent !== false,
					printBackground: true,
					pageSize: options.pageSize || { width: 80000, height: 200000 },
					margins: options.margins || { marginType: 'none' },
					deviceName: options.deviceName || undefined,
				},
				(success, errorType) => {
					hiddenWin.close();
					if (!success) {
						resolve({ ok: false, error: errorType || 'Print failed' });
						return;
					}
					resolve({ ok: true });
				}
			);
		});

		hiddenWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildInvoicePrintHtml(invoice))}`);
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


