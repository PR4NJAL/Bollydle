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
  Progress,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';
import { FaPlay, FaPause, FaQuestion, FaChartBar, FaInfoCircle, FaSearch, FaTimes, FaChevronDown } from 'react-icons/fa';

interface Track {
  id: number;
  title: string;
  file: string;
}

function App() {
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:16'); //setDuration isn't being used
  const [selected, setSelected] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);

  const { isOpen: isInfoOpen, onOpen: onInfoOpen, onClose: onInfoClose } = useDisclosure()
  const { isOpen: isStatsOpen, onOpen: onStatsOpen, onClose: onStatsClose } = useDisclosure()
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure()

  const maxAttempts = 6;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attemptsRef = useRef<string[]>([]);
  const toast = useToast();

  // Define how much audio to reveal based on number of attempts
  const revealMap = [1, 2, 4, 7, 11, 16]; // seconds to reveal at each attempt

  useEffect(() => {
    // Use Vite's import.meta.glob to get all mp3 files
    const audioFiles = import.meta.glob('./assets/playlist/*.mp3', { eager: true });
    console.log("Audio files loaded:", audioFiles);

    // Convert file paths to track objects
    const trackList: Track[] = Object.keys(audioFiles).map((path, index) => {
      // Extract the filename without extension from the path
      const fileName = path.split('/').pop()?.replace('.mp3', '') || '';

      // Parse the file name to get title and artist
      // Assuming format: "SongName - ArtistName.mp3"
      // const title = fileName.split(' - ');

      // Create the correct URL using the import
      const module = audioFiles[path] as { default: string };

      return {
        id: index,
        title: fileName || 'Unknown Title',
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
      console.log("Loading audio track:", currentTrack.title, "File:", currentTrack.file);

      // Set the source and load
      audioRef.current.src = currentTrack.file;
      audioRef.current.load();

      // Set audio volume to a reasonable level
      audioRef.current.volume = 0.7;

      // Add error handler
      const handleError = () => {
        console.error("Audio error:", audioRef.current?.error);
        toast({
          title: "Audio Error",
          description: `Could not load audio: ${audioRef.current?.error?.message || "Unknown error"}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
      };

      audioRef.current.addEventListener('error', handleError);

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('error', handleError);
        }
      };
    }
  }, [currentTrack]);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  const updateTime = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;

      const seconds = Math.floor(current % 60);
      const minutesStr = Math.floor(current / 60).toString();
      const secondsStr = seconds < 10 ? `0${seconds}` : seconds.toString();

      setCurrentTime(`${minutesStr}:${secondsStr}`);

      // If we reach the maximum allowed time for current attempt count, pause
      const maxTimeForAttempts = revealMap[attemptsRef.current.length];
      console.log(attemptsRef.current)
      if (current >= maxTimeForAttempts) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  //togglePlay function
  const togglePlay = () => {
    if (!currentTrack) {
      console.log("No current track to play");
      return;
    }

    console.log("Toggling play for track:", currentTrack.title, "Current playing state:", isPlaying);

    if (isPlaying) {
      // If currently playing, pause the audio
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // If currently paused, play the audio
      // Limit playback time based on number of attempts
      const maxTimeForAttempts = revealMap[attempts.length];

      if (audioRef.current) {
        // If we've gone past the allowed time, restart
        if (audioRef.current.currentTime >= maxTimeForAttempts) {
          audioRef.current.currentTime = 0;
        }

        // Play and handle errors
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio started playing successfully");
              setIsPlaying(true);
            })
            .catch(error => {
              console.error("Error playing audio:", error);
              setIsPlaying(false);
              toast({
                title: "Playback Error",
                description: "There was an error playing the track. Check if audio files are correctly loaded.",
                status: "error",
                duration: 5000,
                isClosable: true,
              });
            });
        }
      }
    }
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
  const getProgressPercentage = () => {
    if (!audioRef.current || attempts.length >= revealMap.length) {
      return 0;
    }

    const maxTime = revealMap[attempts.length];
    const current = audioRef.current.currentTime;
    return (current / maxTime) * 100;
  };

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
          onClick={onInfoOpen}
        />

        <Modal isOpen={isInfoOpen} onClose={onInfoClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Modal Title</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text>
                This is placeholder information text that appears in a modal when you
                click the info button. You can add any content here!
              </Text>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme='blue' mr={3} onClick={onInfoClose}>
                Close
              </Button>
              <Button variant='ghost'>Secondary Action</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

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
            onClick={onStatsOpen}
          />

          <Modal isOpen={isStatsOpen} onClose={onStatsClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Modal Title</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Text>
                  This is placeholder information text that appears in a modal when you
                  click the info button. You can add any content here!
                </Text>
              </ModalBody>
              <ModalFooter>
                <Button colorScheme='blue' mr={3} onClick={onStatsClose}>
                  Close
                </Button>
                <Button variant='ghost'>Secondary Action</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <IconButton
            aria-label="Help"
            icon={<FaQuestion />}
            variant="ghost"
            color="white"
            fontSize="24px"
            size="lg"
            onClick={onHelpOpen}
          />

          <Modal isOpen={isHelpOpen} onClose={onHelpClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Modal Title</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Text>
                  This is placeholder information text that appears in a modal when you
                  click the info button. You can add any content here!
                </Text>
              </ModalBody>
              <ModalFooter>
                <Button colorScheme='blue' mr={3} onClick={onHelpClose}>
                  Close
                </Button>
                <Button variant='ghost'>Secondary Action</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

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
          <Box flex={1} mx={2}>
            <Progress
              value={getProgressPercentage()}
              size="xs"
              colorScheme="whiteAlpha"
              bg="gray.600"
              borderRadius="full"
              sx={{
                '& > div': {
                  transition: 'width 0.25s linear'
                }
              }}
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
            _hover={{ bg: "gray.700" }}
          />
        </Center>
      </Box>

      {/* Input and buttons */}
      <Box position="fixed" bottom="15px" left={0} right={0} p={20} bg="black" borderTop="1px solid" borderColor="gray.800">
        {/* Search select for guess */}
        <Box mb={4} position="relative">
          <InputGroup bg="#222" borderRadius="md">
            <InputLeftElement>
              <Icon as={FaSearch} color="gray.500" />
            </InputLeftElement>
            <Input
              placeholder="Know it? Search for the title"
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value);
                setSelected(false);
              }}
              _placeholder={{ color: 'gray.500' }}
              border="none"
              pr="40px"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              autoComplete="off"
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

          {/* Dropdown menu for suggestions */}
          {guess.trim().length > 0 && !selected && (
            <Box
              position="absolute"
              top="100%"
              left={0}
              right={0}
              bg="#333"
              zIndex={10}
              borderRadius="md"
              overflow="hidden"
              mt={1}
              maxH="200px"
              overflowY="auto"
              boxShadow="md"
            >
              {tracks
                .filter(track =>
                  track.title.toLowerCase().includes(guess.toLowerCase())
                )
                .slice(0, 5) // Limit to 5 suggestions
                .map(track => (
                  <Box
                    key={track.id}
                    p={3}
                    cursor="pointer"
                    _hover={{ bg: "#444" }}
                    onClick={() => {
                      setGuess(track.title);
                      setSelected(true);
                    }}
                  >
                    {track.title}
                  </Box>
                ))}
            </Box>
          )}
        </Box>
        <Flex justify="space-between">
          <Button
            variant="outline"
            color="white"
            borderColor="gray.600"
            onClick={handleSkip}
            width="120px"
            isDisabled={attempts.length >= maxAttempts}
            _hover={{ bg: "gray.700" }}
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