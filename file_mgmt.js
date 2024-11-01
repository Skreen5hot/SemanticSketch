//11-1-2024  7:49am
let db;
    let currentFile = null;

    // Initialize IndexedDB
    function initDB() {
      const request = indexedDB.open('fileEditorDB', 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'name' });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        refreshFileUI(); // Load both the file list and the dropdown options when the database is ready
      };

      request.onerror = (e) => {
        console.error('Error opening IndexedDB:', e);
      };
    }

    // Load both the file list in the <aside> and the dropdowns, making it global
    window.refreshFileUI = function() {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();

      request.onsuccess = (e) => {
        const files = e.target.result;

        // Populate the file list in the <aside>
        const fileListElement = document.getElementById('file-list');
        fileListElement.innerHTML = '';  // Clear the existing list
        files.forEach(file => {
          const li = document.createElement('li');
          
          // Display file name
          const fileNameSpan = document.createElement('span');
          fileNameSpan.textContent = file.name;
          fileNameSpan.style.cursor = 'pointer';
          fileNameSpan.onclick = () => loadFileFromList(file.name);  // Load file on click
          li.appendChild(fileNameSpan);

          // Add edit icon ✎
          const editIcon = document.createElement('span');
          editIcon.textContent = '✎';
          editIcon.style.cursor = 'pointer';
          editIcon.style.marginLeft = '10px';
          editIcon.onclick = () => editFileName(file.name);
          li.appendChild(editIcon);

          // Add delete icon ✖
          const deleteIcon = document.createElement('span');
          deleteIcon.textContent = '✖';
          deleteIcon.style.cursor = 'pointer';
          deleteIcon.style.marginLeft = '10px';
          deleteIcon.onclick = () => deleteFile(file.name);
          li.appendChild(deleteIcon);

          fileListElement.appendChild(li);
        });

        // Populate each <select> element in the file sections
        document.querySelectorAll('.file-section select').forEach(fileSelect => {
          fileSelect.innerHTML = '<option value="" disabled selected>Select a file to open</option>';
          files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.name;
            option.textContent = file.name;
            fileSelect.appendChild(option);
          });
        });
      };

      request.onerror = (e) => {
        console.error('Error loading file list and dropdown:', e);
      };
    }

    // Handle button clicks dynamically
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('fileOpenBtn')) {
        const section = e.target.closest('.file-section');
        const select = section.querySelector('select');
        if (select.value) {
          loadFileFromList(select.value);
        } else {
          alert('Please select a file to open.');
        }
      }

      if (e.target.classList.contains('fileSaveBtn')) {
        const section = e.target.closest('.file-section');
        saveFile(section);
      }

      if (e.target.classList.contains('fileSaveAsBtn')) {
        const section = e.target.closest('.file-section');
        saveFileAs(section);
      }
    });
function loadFileFromList(fileName) {
  const transaction = db.transaction(['files'], 'readonly');
  const store = transaction.objectStore('files');
  const request = store.get(fileName);

  request.onsuccess = (e) => {
    const file = e.target.result;
    if (file) {
      // Load the file content into the relevant textarea
      document.querySelectorAll('.file-section').forEach(section => {
        const select = section.querySelector('select');
        if (select.value === fileName) {
          const textarea = section.querySelector('textarea');
          textarea.value = file.content;

          // Load RDF content into the store without executing the query
          loadRDFContent(file.content); // Ensure RDF is loaded
          // No need to call executeQuery() here
        }
      });
    } else {
      console.error(`File "${fileName}" not found.`);
    }
  };

  request.onerror = (e) => {
    console.error('Error loading file from IndexedDB:', e);
  };
}


  request.onerror = (e) => {
    console.error('Error loading file from IndexedDB:', e);
  };
}
function saveFileAs(section) {
  const textarea = section.querySelector('textarea');
  const fileName = prompt('Enter the new file name:');
  
  if (fileName) {
    const content = textarea.value;
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');

    // Check if the file with the same name already exists
    const getRequest = store.get(fileName);
    
    getRequest.onsuccess = (e) => {
      const existingFile = e.target.result;

      if (existingFile) {
        // File with the same name already exists, ask for confirmation to overwrite
        if (!confirm(`A file named "${fileName}" already exists. Do you want to overwrite it?`)) {
          return; // Exit if the user does not want to overwrite
        }
      }

      // Save the new file content
      const saveRequest = store.put({ name: fileName, content: content });

      saveRequest.onsuccess = () => {
        alert('File saved successfully!');
        refreshFileUI();  // Refresh the UI to reflect the new file
      };

      saveRequest.onerror = (e) => {
        console.error('Error saving file:', e);
      };
    };

    getRequest.onerror = (e) => {
      console.error('Error checking if file exists:', e);
    };
  } else {
    alert('File name cannot be empty.');
  }
}
function saveFile(section) {
  const textarea = section.querySelector('textarea');
  const currentFileName = section.querySelector('select').value;

  if (currentFileName) {
    const content = textarea.value;
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');

    // Save the file with the current name (overwrite)
    const request = store.put({ name: currentFileName, content: content });

    request.onsuccess = () => {
      alert('File saved successfully!');
    };

    request.onerror = (e) => {
      console.error('Error saving file:', e);
    };
  } else {
    alert('Please select a file to save.');
  }
}


    function editFileName(oldName) {
      const newName = prompt('Enter the new file name:', oldName);
      if (newName && newName !== oldName) {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');

        // Retrieve the file content with the old name
        const getRequest = store.get(oldName);

        getRequest.onsuccess = (e) => {
          const file = e.target.result;
          if (file) {
            // Delete the old file
            const deleteRequest = store.delete(oldName);

            deleteRequest.onsuccess = () => {
              // Add the file with the new name
              const addRequest = store.add({ name: newName, content: file.content });

              addRequest.onsuccess = () => {
                alert('File renamed successfully!');
                refreshFileUI();  // Refresh the file list and dropdown
              };

              addRequest.onerror = (e) => {
                console.error('Error renaming file:', e);
              };
            };

            deleteRequest.onerror = (e) => {
              console.error('Error deleting old file:', e);
            };
          }
        };

        getRequest.onerror = (e) => {
          console.error('Error fetching file for renaming:', e);
        };
      }
    }

    function deleteFile(fileName) {
      if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.delete(fileName);

        request.onsuccess = () => {
          alert(`File "${fileName}" deleted successfully!`);
          refreshFileUI();  // Refresh the file list and dropdown after deletion
        };

        request.onerror = (e) => {
          console.error('Error deleting file:', e);
        };
      }
    }

    // Listen for file uploads
// Listen for file uploads
document.getElementById('file-input').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const files = event.target.files;

  Array.from(files).forEach(file => {
    const reader = new FileReader();

    reader.onload = function(e) {
      const content = e.target.result;
      const fileName = file.name;

      // Create a transaction for each file read to ensure the transaction is active
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');

      // Save the file content into IndexedDB
      const request = store.put({ name: fileName, content: content });

      request.onsuccess = () => {
        console.log(`File "${fileName}" uploaded successfully!`);
        refreshFileUI(); // Refresh the file list and dropdowns after uploading
      };

      request.onerror = (e) => {
        console.error(`Error uploading file "${fileName}":`, e);
      };
    };

    reader.readAsText(file);
  });
}



    // Initialize the app
    window.onload = () => {
      initDB();
    };
