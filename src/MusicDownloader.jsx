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

  const handleSearch = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // if search term is empty, return Bohemian Rhapsody
    const searchTerm = formData.get("searchTerm") || "Bohemian Rhapsody";
    

    // URL encode the search term
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
        
        // Transform the API response to match our expected format
        if (data.items && data.items.length > 0) {
          // Use Promise.all to wait for all download URL fetches to complete
          const formattedResults = await Promise.all(
            data.items.map(async item => { // Make sure the callback is async
              const artistName = item.artist?.name || (item.artists?.[0]?.name || "Unknown Artist");
              const coverUrl = item.album?.cover ? `https://resources.tidal.com/images/${item.album.cover.replace(/-/g, "/")}/1280x1280.jpg` : "https://via.placeholder.com/60";
              let downloadUrl = ""; // Initialize downloadUrl

              // Retry logic for fetching download URL
              let downloadAttempts = 0;
              const maxDownloadAttempts = 2;
              let lastDownloadError = null;

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
                  break; // Success, break out of the retry loop
                } catch (error) {
                  console.error(`Attempt ${downloadAttempts}: Error fetching download URL:`, error);
                  lastDownloadError = error;           
                }
              }

              if (!downloadUrl && lastDownloadError) {
                console.error("Failed to fetch download URL after multiple attempts:", lastDownloadError);
                // Handle the error appropriately, e.g., set a default download URL or display an error message
                downloadUrl = ""; // Set a default value in case of error
              }
        
              return {
                id: item.id,
                title: item.title,
                artist: artistName,
                duration: formatDuration(item.duration), // Convert seconds to MM:SS format
                version: item.version || "",
                album: item.album?.title || "",
                cover: coverUrl,
                downloadUrl: downloadUrl, // Use the updated downloadUrl
              };
            })
          );
          setResults(formattedResults);
          break; // Break out of the search retry loop if successful
        } else {
          console.log("Empty API Response");
          setResults([
            { 
              id: 1, 
              title: "Default 1", 
              artist: "Default 1", 
              duration: "3:45", 
              version: "2011 Remaster",
              album: "Greatest Hits",
              cover: "https://resources.tidal.com/images/e3450cf9/3fe2/4d5f/abb8/bc9fc9b54a39/1280x1280.jpg",
              downloadUrl: ""
            },
            { 
              id: 2, 
              title: "Empty API Response", 
              artist: "Default 2", 
              duration: "4:20", 
              version: "Original Mix",
              album: "Singles Collection",
              cover: "https://via.placeholder.com/60",
              downloadUrl: ""
            },
          ]);
          break; // Break out of the search retry loop if successful (even with empty response)
        }
      } catch (error) {
        console.error(`Attempt ${attempts}: Error fetching results:`, error);
        lastError = error;
      }
    }

    if (lastError) {
      console.error("Failed to fetch search results after multiple attempts:", lastError);
      // Set some sample data for testing
      setResults([
        { 
          id: 1, 
          title: "Song 1", 
          artist: "Artist 1", 
          duration: "3:15", 
          version: "2023 Remaster",
          album: "Album Title One",
          cover: "https://resources.tidal.com/images/e3450cf9/3fe2/4d5f/abb8/bc9fc9b54a39/1280x1280.jpg",
          downloadUrl: ""
        },
        { 
          id: 2, 
          title: "Song 2", 
          artist: "Artist 2", 
          duration: "2:48", 
          version: "Live at Madison Square Garden",
          album: "Concert Collection 2022",
          cover: "https://via.placeholder.com/60",
          downloadUrl: ""
        },
      ]);
    }
  };

  const handleDownload = async (song) => {
    if (song.downloadUrl) {
      try {
        const response = await fetch(song.downloadUrl, { mode: 'cors' });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${song.title} - ${song.artist}.mp3`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url); // Clean up the URL object
      } catch (error) {
        console.error("Error downloading file:", error);
        alert("Error downloading file.");
      }
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
            className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold"
          >
            Search
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold"
                  onClick={() => handleDownload(song)}
                >
                  Download
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