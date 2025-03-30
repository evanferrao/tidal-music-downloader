import { useState } from "react";

const MusicDownloader = () => {
  const [results, setResults] = useState([]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchTerm = formData.get("searchTerm");

    // boilerplate code to simulate an API call
    try {
        const response = await fetch(`https://api.example.com/search?q=${searchTerm}`);
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        setResults(data.songs || []);
        
        // Fallback for testing if API is not ready
        if (!data.songs || data.songs.length === 0) {
          setResults([
            { id: 1, title: "Default 1", artist: "Default 1" },
            { id: 2, title: "Empty API Response", artist: "Default 2" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        // Set some sample data for testing
        setResults([
          { id: 1, title: "Song 1", artist: "Artist 1" },
          { id: 2, title: "Song 2", artist: "Artist 2" },
        ]);
      }

    // setResults([
    //     { id: 1, title: "Song 1", artist: "Artist 1" },
    //     { id: 2, title: "Song 2", artist: "Artist 8" },
    //   ]);
  };

  const handleDownload = (song) => {
    alert(`Downloading: ${song.title} by ${song.artist}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Music Downloader</h1>
      
      <form onSubmit={handleSearch} className="w-full max-w-lg flex gap-2">
        <input
          type="text"
          name="searchTerm"
          placeholder="Search Music"
          className="w-full p-3 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          defaultValue="test"
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
          <div key={song.id} className="bg-gray-900 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-lg font-medium">{song.title}</p>
              <p className="text-gray-400">{song.artist}</p>
            </div>
            <button
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold"
              onClick={() => handleDownload(song)}
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicDownloader;