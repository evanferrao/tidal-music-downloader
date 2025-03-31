import { useState } from "react";
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import Footer from './Footer';
const apiUrl = `https://tidal-download.npotest12343727.workers.dev`;

// Helper function to format duration from seconds to MM:SS
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MusicDownloader = () => {
  const [results, setResults] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null); // Track the ID of the song being downloaded
  const [searching, setSearching] = useState(false); // Track whether a search is in progress

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearching(true); // Set searching state to true
    const formData = new FormData(event.currentTarget);
    const searchTerm = formData.get("searchTerm") || "Bohemian Rhapsody";

    const encodedSearchTerm = encodeURIComponent(searchTerm);

    let attempts = 0;
    const maxAttempts = 2;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await fetch(`${apiUrl}/search/?s=${encodedSearchTerm}`);
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const formattedResults = await Promise.all(
            data.items.map(async item => {
              const artistName = item.artist?.name || (item.artists?.[0]?.name || "Unknown Artist");
              const coverUrl = item.album?.cover ? `https://resources.tidal.com/images/${item.album.cover.replace(/-/g, "/")}/1280x1280.jpg` : "https://via.placeholder.com/60";
              let downloadUrl = "";

              let downloadAttempts = 0;
              const maxDownloadAttempts = 2;

              while (downloadAttempts < maxDownloadAttempts) {
                try {
                  downloadAttempts++;
                  const cacheBuster = Date.now();
                  const downloadResponse = await fetch(`${apiUrl}/track/?id=${item.id}&quality=${item.audioQuality}&cb=${cacheBuster}`);

                  if (!downloadResponse.ok) {
                    throw new Error(`Attempt ${downloadAttempts}: Network response was not ok`);
                  }

                  const downloadData = await downloadResponse.json();
                  downloadUrl = downloadData?.[2]?.OriginalTrackUrl || "";
                  break;
                } catch (error) {
                  console.error(`Attempt ${downloadAttempts}: Error fetching download URL:`, error);
                }
              }

              return {
                id: item.id,
                title: item.title,
                artist: artistName,
                duration: formatDuration(item.duration),
                version: item.version || "",
                album: item.album?.title || "",
                cover: coverUrl,
                downloadUrl: downloadUrl,
              };
            })
          );
          setResults(formattedResults);
          break;
        } else {
          console.log("Empty API Response");
          setResults([]);
          break;
        }
      } catch (error) {
        console.error(`Attempt ${attempts}: Error fetching results:`, error);
        lastError = error;
      }
    }

    if (lastError) {
      console.error("Failed to fetch search results after multiple attempts:", lastError);
      setResults([]);
    }

    setSearching(false); // Reset searching state
  };

  const handleDownload = async (song) => {
    if (song.downloadUrl) {
      setDownloadingId(song.id); // Set the downloading state for the current song
      const maxRetries = 3; // Maximum number of retries
      let attempts = 0;

      while (attempts < maxRetries) {
        try {
          attempts++;
          console.log(`Download attempt ${attempts} for ${song.title}`);

          const response = await fetch(song.downloadUrl);

          if (!response.ok) {
            throw new Error("Failed to fetch the file");
          }

          // Get the total file size from the response headers
          const contentLength = response.headers.get("Content-Length");
          if (!contentLength) {
            throw new Error("Unable to determine file size");
          }

          const totalSize = parseInt(contentLength, 10);
          let downloadedSize = 0;

          // Create a readable stream to track progress
          const reader = response.body.getReader();
          const chunks = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            downloadedSize += value.length;

            // Calculate and log the download progress
            const progress = Math.round((downloadedSize / totalSize) * 100);
            console.log(`Download progress: ${progress}%`);
          }

          // Ensure the entire file is downloaded
          if (downloadedSize !== totalSize) {
            throw new Error("Incomplete download. File size mismatch.");
          }

          // Combine all chunks into a single blob
          const blob = new Blob(chunks);
          const url = window.URL.createObjectURL(blob);

          // Create a temporary link element
          const link = document.createElement("a");
          link.href = url;
          const timestamp = Date.now();
          link.setAttribute("download", `${song.title} - ${song.artist} - (${timestamp})`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Revoke the temporary URL to free up memory
          window.URL.revokeObjectURL(url);

          console.log(`Download completed successfully for ${song.title}`);
          break; // Exit the retry loop if the download is successful
        } catch (error) {
          console.error(`Error during download attempt ${attempts}:`, error);

          if (attempts >= maxRetries) {
            alert(`Failed to download ${song.title} after ${maxRetries} attempts.`);
            break; // Exit the loop after reaching the maximum retries
          }

          console.warn(`Retrying download for ${song.title}... (${attempts}/${maxRetries})`);
        }
      }

      setDownloadingId(null); // Reset the downloading state
    } else {
      alert("Download link not available.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex-grow flex flex-col items-center p-6">
        <h1 className="text-3xl font-bold mb-6">Music Downloader</h1>
        
        <form onSubmit={handleSearch} className="w-full max-w-lg flex gap-2">
          <input
            type="text"
            name="searchTerm"
            placeholder="Search Music"
            className="w-full p-3 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            defaultValue=""
          />
          <button
            type="submit"
            className={`px-4 py-3 rounded-lg text-white font-semibold ${
              searching
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-500"
            }`}
            disabled={searching} // Disable the button while searching
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
        
        <div className="w-full max-w-lg mt-6 space-y-4">
          {results.map((song) => (
            <div 
              key={song.id} 
              className="bg-gray-900 p-4 rounded-lg flex flex-col relative group"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <img 
                    src={song.cover || "https://resources.tidal.com/images/e3450cf9/3fe2/4d5f/abb8/bc9fc9b54a39/1280x1280.jpg"} 
                    alt={`${song.title} album cover`}
                    className="w-12 h-12 rounded mr-3 object-cover"
                  />
                  <div>
                    <p className="text-lg font-medium">{song.title}</p>
                    <div className="flex items-center text-gray-400 text-sm">
                      <span>{song.artist}</span>
                      <span className="mx-2">•</span>
                      <span>{song.duration || "--:--"}</span>
                    </div>
                  </div>
                </div>
                <button
                  className={`px-4 py-2 rounded-lg text-white font-semibold ${
                    downloadingId === song.id
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-500"
                  }`}
                  onClick={() => handleDownload(song)}
                  disabled={downloadingId === song.id} // Disable the button while downloading
                >
                  {downloadingId === song.id ? "Downloading..." : "Download"}
                </button>
              </div>
              
              {song.album && (
                <p className="text-xs text-gray-500 mt-3 pl-15 ml-15">
                  From album: {song.album}
                </p>
              )}
              
              {song.version && (
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-3 py-1 bg-gray-800 text-xs text-white rounded pointer-events-none">
                  {song.version}
                </div>
              )}
              {song.downloadUrl && (
                <>
                  <Plyr
                    source={{
                      type: 'audio',
                      sources: [{ src: song.downloadUrl, type: 'audio/mp3' }],
                    }}
                    options={{}}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MusicDownloader;