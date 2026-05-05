const csvInput = document.getElementById("csv-file-input");
const dataPreview = document.getElementById("data-preview");
const datasetInfo = document.getElementById("dataset-info");
const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const chatWindow = document.getElementById("chat-window");
const statusArea = document.querySelector(".status-area");
const historyList = document.getElementById('history-list');
const fileInput = document.getElementById('csv-file-input');
const clearHistoryBtn = document.getElementById('clear-history');

let datasets = [];
// 1. Function to render history
async function renderHistory(firstTime=false) {
	datasets = await getDatasets();
	historyList.innerHTML = datasets.length ? '' : '<p class="text-center">No past uploads</p>';

	datasets.forEach((item) => {
		const div = document.createElement('div');
		// Added 'flex justify-between items-center' for layout
		div.className = "card dataset-card";
		div.innerHTML = `
			<div class="card-header px-2">${item.uploaded_at}</div>
			<div class="card-body">${item.name} - ${item.is_current ? 'Current' : 'Not Current'}</div>
			<div class="card-footer">
				<button class="use-btn btn btn-sm btn-primary button-elegant">Use</button>
				<button class="delete-btn btn btn-sm btn-danger button-elegant">Delete</button>
			</div>
		`;

		// Load Dataset Logic
		const useBtn = div.querySelector('.use-btn');
		useBtn.onclick = async (e) => {
			e.stopPropagation(); // Prevents the parent div.onclick from firing
			console.log("Load dataset:", item.name);
			await loadDataset(item.name);
			alert(`Dataset "${item.name}" loaded! You can now ask questions about it.`);
		};

		// Delete Logic
		const delBtn = div.querySelector('.delete-btn');
		delBtn.onclick = async (e) => {
			e.stopPropagation(); // Prevents the parent div.onclick from firing
			if (confirm(`Delete ${item.name}?`)) {
				await deleteDataset(item);
				renderHistory(); // Refresh the list
			}
		};

		if (firstTime) {
			// If it's the first time loading, we want to auto-load the most recent dataset
			if (item.is_current) {
				loadDataset(item.name);
			}
		}

		historyList.appendChild(div);
	});
}

async function deleteDataset(item) {
	await fetch(`/datasets/${item.name}`, { method: 'DELETE' })
		.then(res => res.json())
		.then(data => {
			if (data.error) {
				console.error("Error deleting dataset:", data.error);
			} else {
				console.log("Dataset deleted:", item.name);
			}
		})
		.catch(err => {
			console.error("Error deleting dataset:", err);
		});
}

async function loadDataset(name) {
	try {
		const response = await fetch(`/datasets/${name}`);
		const result = await response.json();
		if (result.error) throw new Error(result.error);
		renderHistory(); // Refresh history to update "Current" status
		loadPreview(result); // Show preview of loaded dataset		
		return result;
	} catch (error) {
		console.error("Error loading dataset:", error);
	}
}

async function getDatasets() {
	return fetch("/datasets")
		.then(response => response.json())
		.then(data => {
			const datasets = data.datasets || [];
			return datasets;
		})
		.catch(err => {
			console.error("Error fetching datasets:", err);
		});
}

// 2. Update history when a new file is uploaded
fileInput.addEventListener('change', function (e) {
	if (this.files && this.files[0]) {
		const newFile = {
			name: this.files[0].name,
			date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			timestamp: Date.now()
		};

		const history = JSON.parse(localStorage.getItem('csv_history') || '[]');
		history.unshift(newFile); // Add to start
		localStorage.setItem('csv_history', JSON.stringify(history.slice(0, 10))); // Keep last 10
		renderHistory();
	}
});

// 3. Clear History
document.getElementById('clear-history').addEventListener('click', async () => {
	for (const item of datasets) {
		await deleteDataset(item);
	}
	renderHistory();
});



// --- UI Helpers ---

const createMessage = (text, role) => {
	const isBot = role === 'bot';

	const wrapper = document.createElement("div");
	wrapper.className = `d-flex flex-column mb-3 ${isBot ? 'align-items-start' : 'align-items-end'}`;

	const label = document.createElement("small");
	label.className = "chat-label mb-1";
	label.textContent = isBot ? "AI Assistant" : "You";

	const bubble = document.createElement("div");
	bubble.className = `
        p-2 px-3 rounded chat-bubble
        ${isBot ? 'bot-bubble' : 'user-bubble'}
    `;

	// Optional: limit width so messages don't stretch full screen
	bubble.style.maxWidth = "75%";

	bubble.textContent = text;

	wrapper.appendChild(label);
	wrapper.appendChild(bubble);

	return wrapper;
};




// thinkingIndicator.classList.remove("hidden");

// --- Event Listeners ---

csvInput.addEventListener("change", async () => {
	if (csvInput.files.length === 0) return;

	const formData = new FormData();
	formData.append("file", csvInput.files[0]);

	try {
		const response = await fetch("/upload", { method: "POST", body: formData });
		const result = await response.json();

		if (result.error) throw new Error(result.error);

		loadPreview(result);
		await renderHistory(); // Refresh history to show new upload

	} catch (err) {
		alert(err.message);
	}
});

function loadPreview(result) {
	dataPreview.innerHTML = "";
	if (result.columns) {
		const tableContainer = document.createElement("div");
		// REMOVED 'w-50', ADDED 'w-full' and 'overflow-x-auto'
		tableContainer.className = "";

		const table = document.createElement("table");
		// ADDED 'w-max' to ensure the table expands to its content's width
		table.className = "w-max min-w-full divide-y divide-gray-200 dark:divide-white/10 text-left";

		// Headers
		const thead = document.createElement("thead");
		thead.className = "";
		const headerRow = document.createElement("tr");
		result.columns.forEach(column => {
			const th = document.createElement("th");
			// ADDED 'whitespace-nowrap' here
			th.className = "";
			th.textContent = column;
			headerRow.appendChild(th);
		});
		thead.appendChild(headerRow);
		table.appendChild(thead);

		// Body (Keeping your existing logic but ensuring 'whitespace-nowrap' stays)
		if (result.preview) {
			const tbody = document.createElement("tbody");
			tbody.className = "divide-y divide-gray-200 dark:divide-white/5";
			result.preview.forEach(row => {
				const tr = document.createElement("tr");
				result.columns.forEach(col => {
					const td = document.createElement("td");
					td.className = "px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300";
					td.textContent = row[col];
					tr.appendChild(td);
				});
				tbody.appendChild(tr);
			});
			table.appendChild(tbody);
		}
		tableContainer.appendChild(table);
		dataPreview.appendChild(tableContainer);
	}
	datasetInfo.innerHTML = "";
	datasetInfo.innerHTML = renderDatasetInfo(result).outerHTML;
}

function renderDatasetInfo(result) {
	const container = document.createElement("div");
	container.className = "mt-4";

	container.innerHTML = `
		<div class="card shadow-sm mb-3">
			<div class="card-header fw-semibold">
				DATASET SUMMARY
			</div>
			<div class="card-body p-0">
				<table class="table table-bordered table-striped mb-0">
					<tbody>
						<tr>
							<th scope="row">Total Rows</th>
							<td>${result.total_rows}</td>
						</tr>
						<tr>
							<th scope="row">Total Columns</th>
							<td>${result.total_columns}</td>
						</tr>
						<tr>
							<th scope="row">Shape</th>
							<td>(${result.shape[0]}, ${result.shape[1]})</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<div class="card shadow-sm mb-3">
			<div class="card-header fw-semibold">
				COLUMN DATA TYPES
			</div>
			<div class="card-body p-0">
				<div class="table-responsive">
					<table class="table table-hover mb-0">
						<thead class="table-light">
							<tr>
								<th>Column</th>
								<th>Type</th>
							</tr>
						</thead>
						<tbody>
							${Object.entries(result.data_types).map(([col, type]) => `
								<tr>
									<td>${col}</td>
									<td><span class="badge bg-secondary">${type}</span></td>
								</tr>
							`).join("")}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<div class="card shadow-sm">
			<div class="card-header fw-semibold">
				DATAFRAME INFO
			</div>
			<div class="card-body">
				<pre class="mb-0 small bg-dark text-light p-3 rounded overflow-auto" style="max-height: 300px;">
${result.info || 'No info available'}
				</pre>
			</div>
		</div>
	`;

	return container;
}
function tryParseJSON(text) {
	try {
		return typeof text === "string" ? JSON.parse(text) : text;
	} catch (e) {
		return null;
	}
}
const sendQuestion = async () => {
	const query = userInput.value.trim();
	if (!query) return;

	sendBtn.disabled = true;
	sendBtn.classList.add("cursor-not-allowed", "opacity-50");

	// Add User Message
	chatWindow.appendChild(createMessage(query, 'user'));
	userInput.value = "";
	chatWindow.scrollTop = chatWindow.scrollHeight;

	const thinking = createMessage("Thinking...", 'bot');
	chatWindow.appendChild(thinking);
	chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });

	try {
		const formData = new FormData();
		formData.append("question", query);

		const response = await fetch("/ask", { method: "POST", body: formData });
		const result = await response.json();

		thinking.remove();

		// Add Bot Response
		let botText = result.answer || result.code || result.error || JSON.stringify(result) + "\n\nI couldn't process that.";
		let parsedBotText = tryParseJSON(botText);
		if (parsedBotText) {
			botText = JSON.stringify(parsedBotText, null, 2);
		}
		chatWindow.appendChild(createMessage(botText, 'bot'));

	} catch (err) {
		chatWindow.appendChild(createMessage("Connection error. Please try again.", 'bot'));
		console.error(err);
	} finally {
		sendBtn.disabled = false;
		sendBtn.classList.remove("cursor-not-allowed", "opacity-50");

		chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
	}
};

sendBtn.addEventListener("click", sendQuestion);
userInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter") sendQuestion();
});

document.addEventListener("DOMContentLoaded", () => {
	// Optional: Auto-focus the input field on page load
	userInput.focus();
	// Initial render
	renderHistory(firstTime=true);
	chatWindow.appendChild(createMessage("Hello! I'm your AI assistant. Ask me anything about your data.", 'bot'));
	chatWindow.appendChild(createMessage("Upload a CSV file to get started.", 'user'));
});