// Client-side in handleDownloadWord
// ...
                if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
                    const errorData = JSON.parse(responseText);
                    // This is the log you are seeing:
                    console.error("Server JSON error details for Word generation:", errorData); 

                    if (Object.keys(errorData).length === 0) { // Checks if errorData is {}
                        errorDetails = 'Server returned an empty JSON error object.';
                    } else {
                        errorDetails = errorData.details || errorData.error || errorDetails;
                    }
// ...
