import { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Heading, 
  Input, 
  Text, 
  Flex, 
  IconButton, 
  InputGroup, 
  InputLeftElement,
  InputRightElement,
  Center,
  Icon,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { FaPlay, FaPause, FaQuestion, FaChartBar, FaInfoCircle, FaSearch, FaTimes, FaChevronDown } from 'react-icons/fa';

interface Track {
  id: number;
  title: string;
  artist: string;
  file: string;
}

function App() {
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:16');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const maxAttempts = 6;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  // Define how much audio to reveal based on number of attempts
  const revealMap = [1, 2, 4, 7, 11, 16]; // seconds to reveal at each attempt

  useEffect(() => {
    // Use Vite's import.meta.glob to get all mp3 files
    const audioFiles = import.meta.glob('./assets/playlist/*.mp3', { eager: false });//Abhi ke liye false
    console.log("Audio files loaded:", audioFiles);

    // Convert file paths to track objects
    const trackList: Track[] = Object.keys(audioFiles).map((path, index) => {
      // Extract the filename without extension from the path
      const fileName = path.split('/').pop()?.replace('.mp3', '') || '';
      
      // Parse the file name to get title and artist
      // Assuming format: "SongName - ArtistName.mp3"
      const [title, artist] = fileName.split(' - ');

      // Create the correct URL using the import
      const module = audioFiles[path] as { default: string };
      
      return {
        id: index,
        title: title || 'Unknown Title',
        artist: artist || 'Unknown Artist',
        file: module.default,
      };
    });
    
    setTracks(trackList);
    
    // Select a random track
    //if (trackList.length > 0) {
      //const randomIndex = Math.floor(Math.random() * trackList.length);
      //setCurrentTrack(trackList[randomIndex]);
    //}
    setCurrentTrack(trackList[0]); //Kyunki abhi sirf Talwinder ki playlist h, baad me uncomment

    setLoading(false);

    // Create audio element
    audioRef.current = new Audio();
    audioRef.current.addEventListener('timeupdate', updateTime);
    audioRef.current.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateTime);
        audioRef.current.removeEventListener('ended', () => setIsPlaying(false));
        audioRef.current.pause();
      }
    };
  }, []);

  // When current track changes, set up the audio
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.file;
      audioRef.current.load();
    }
  }, [currentTrack]);

  const updateTime = () => {
    if (audioRef.current) {
      const current = Math.floor(audioRef.current.currentTime);
      const seconds = current % 60;
      const minutesStr = Math.floor(current / 60).toString();
      const secondsStr = seconds < 10 ? `0${seconds}` : seconds.toString();
      
      setCurrentTime(`${minutesStr}:${secondsStr}`);
      
      // If we reach the maximum allowed time for current attempt count, pause
      const maxTimeForAttempts = revealMap[attempts.length];
      if (current >= maxTimeForAttempts) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    console.log("Toggling play for track:", currentTrack.title);
    
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      // Limit playback time based on number of attempts
      const maxTimeForAttempts = revealMap[attempts.length];
      
      if (audioRef.current) {
        // If we've gone past the allowed time, restart
        if (audioRef.current.currentTime > maxTimeForAttempts) {
          audioRef.current.currentTime = 0;
        }
        
        audioRef.current.play()
          .catch(error => {
            console.error("Error playing audio:", error);
            toast({
              title: "Playback Error",
              description: "There was an error playing the track",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          });
      }
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleSubmit = () => {
    if (!guess.trim() || attempts.length >= maxAttempts) return;
    
    const correctAnswer = currentTrack?.title || "";
    const isCorrect = guess.toLowerCase() === correctAnswer.toLowerCase();
    
    // Add result to attempts
    setAttempts(prev => [...prev, guess]);
    setGuess('');
    
    if (isCorrect) {
      toast({
        title: "Correct!",
        description: `You guessed it right: ${correctAnswer}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      // Reveal full song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (attempts.length + 1 >= maxAttempts) {
      // Last attempt and wrong
      toast({
        title: "Game Over",
        description: `The correct answer was: ${correctAnswer}`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const handleSkip = () => {
    if (attempts.length >= maxAttempts) return;
    
    setAttempts(prev => [...prev, 'Skipped']);
    
    // Increase the playback time allowance
    if (audioRef.current && attempts.length + 1 < revealMap.length) {
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleClearInput = () => {
    setGuess('');
  };

  // Fill in empty attempts to display all boxes
  const attemptsToShow = [...attempts];
  while (attemptsToShow.length < maxAttempts) {
    attemptsToShow.push('');
  }

  // Calculate progress percentage based on current time and allowed time
  const progressPercentage = audioRef.current && attempts.length < revealMap.length ? 
    (audioRef.current.currentTime / revealMap[attempts.length]) * 100 : 0;

  return (
    <Box bg="black" color="white" minH="100vh" minW="100vw" p={20}>
      {/* Header */}
      <Flex justify="space-between" align="center" px={4} py={3} borderBottom="1px solid" borderColor="gray.700">
        <IconButton 
          aria-label="Info" 
          icon={<FaInfoCircle />} 
          variant="ghost" 
          color="white" 
          fontSize="24px"
          size="lg"
        />
        <Heading size="lg">Bollydle Unlimited</Heading>
        <Flex>
          <IconButton 
            aria-label="Stats" 
            icon={<FaChartBar />} 
            variant="ghost" 
            color="white" 
            fontSize="24px"
            size="lg"
            mr={2}
          />
          <IconButton 
            aria-label="Help" 
            icon={<FaQuestion />} 
            variant="ghost" 
            color="white" 
            fontSize="24px"
            size="lg"
          />
        </Flex>
      </Flex>

      {/* Main content area */}
      <Box px={4} py={6} pb="200px"> 
        {/* Attempt boxes */}
        {attemptsToShow.map((attempt, index) => (
          <Box 
            key={index} 
            borderColor="gray.600" 
            borderWidth={1} 
            mb={2}
            p={2} 
            height="50px"
            display="flex"
            alignItems="center"
            px={4}
            fontSize="20px"
            fontWeight="bold"
          >
            {attempt}
          </Box>
        ))}
        
        {/* Play instructions */}
        <Center mt={8} color="gray.400">
          <Flex direction="column" align="center">
            <Text mb={2}>Turn up the volume and tap to start the track!</Text>
            <Icon as={FaChevronDown} />
          </Flex>
        </Center>
      </Box>

      {/* Audio player */}
      <Box position="fixed" bottom="250px" left={0} right={0} bg="black" p={20}>
        <Flex justify="center" align="center" px={12}>
          <Text mr={4}>{currentTime}</Text>
          <Box 
            flex={1} 
            height="1px" 
            bg="gray.600"
            position="relative"
          >
            <Box 
              position="absolute"
              top={0}
              left={0}
              height="1px"
              width={`${progressPercentage}%`}
              bg="white"
            />
          </Box>
          <Text ml={4}>{attempts.length < revealMap.length ? `0:${revealMap[attempts.length].toString().padStart(2, '0')}` : duration}</Text>
        </Flex>
        <Center mt={4}>
          <IconButton
            aria-label={isPlaying ? "Pause" : "Play"}
            icon={isPlaying ? <FaPause /> : <FaPlay />}
            isRound
            size="lg"
            variant="outline"
            borderColor="white"
            color="white"
            borderWidth={2}
            onClick={togglePlay}
            isLoading={loading}
          />
        </Center>
      </Box>

      {/* Input and buttons */}
      <Box position="fixed" bottom="15px" left={0} right={0} p={20} bg="black" borderTop="1px solid" borderColor="gray.800">
        <InputGroup mb={4} bg="#222" borderRadius="md">
          <InputLeftElement>
            <Icon as={FaSearch} color="gray.500" />
          </InputLeftElement>
          <Input
            placeholder="Know it? Search for the title"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            _placeholder={{ color: 'gray.500' }}
            border="none"
            pr="40px"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
          {guess && (
            <InputRightElement>
              <IconButton 
                aria-label="Clear input" 
                icon={<FaTimes />} 
                size="sm" 
                variant="ghost"
                onClick={handleClearInput}
              />
            </InputRightElement>
          )}
        </InputGroup>
        <Flex justify="space-between">
          <Button 
            variant="outline" 
            color="white" 
            borderColor="gray.600"
            onClick={handleSkip}
            width="120px"
            isDisabled={attempts.length >= maxAttempts}
          >
            SKIP (+1s)
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            bg="#6c9bcf"
            width="120px"
            isDisabled={!guess.trim() || attempts.length >= maxAttempts}
          >
            SUBMIT
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}

export default App;
