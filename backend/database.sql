-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 25, 2025 at 06:13 PM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `transport_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `places`
--

CREATE TABLE `places` (
  `placeId` int(11) NOT NULL,
  `placeName` varchar(50) NOT NULL,
  `link` varchar(255) NOT NULL,
  `pics` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `places`
--

INSERT INTO `places` (`placeId`, `placeName`, `link`, `pics`) VALUES
(1, 'ตึก 80', 'https://maps.app.goo.gl/LbrspzbAToAoRQgo7', '1744201388702-510248825.jpg'),
(2, 'ตึก 38 IT', 'https://maps.app.goo.gl/C3kdseuKWkfDU4E98', '1744202228657-115959815.jpg'),
(3, 'อาคาร 7', 'https://maps.app.goo.gl/RPbfvZ3j9ENod4yL6', '1744223248764-562266425.jpg'),
(4, 'ห้องสมุด', 'https://maps.app.goo.gl/EjAt1GxQ3uajQ4kMA', '1744315502662-389847044.jpg'),
(5, 'ตลาดน้อย มมส', 'https://maps.app.goo.gl/uqPLeveCirfBoHoN9', '1752821784517-234383440.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `riders`
--

CREATE TABLE `riders` (
  `riderId` varchar(15) NOT NULL,
  `riderNationalId` varchar(13) NOT NULL,
  `riderFirstname` varchar(30) NOT NULL,
  `riderLastname` varchar(30) NOT NULL,
  `riderEmail` varchar(50) NOT NULL,
  `riderPass` varchar(255) NOT NULL,
  `riderTel` varchar(15) NOT NULL,
  `riderAddress` varchar(255) NOT NULL,
  `RiderProfilePic` varchar(255) DEFAULT NULL,
  `RiderStudentCard` varchar(255) DEFAULT NULL,
  `riderLicense` varchar(255) NOT NULL,
  `QRscan` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected','suspended') DEFAULT 'pending',
  `riderRate` decimal(3,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `riders`
--

INSERT INTO `riders` (`riderId`, `riderNationalId`, `riderFirstname`, `riderLastname`, `riderEmail`, `riderPass`, `riderTel`, `riderAddress`, `RiderProfilePic`, `RiderStudentCard`, `riderLicense`, `QRscan`, `status`, `riderRate`) VALUES
('0000000000000', '0000000000000', '00', '001', '00@gmail.com', '$2b$10$25WZgaRsbJiwbtlIViumLegULaSyggsEM65zAEdeFPD1X72c2DM.C', '0000000000', '00/00', 'uploads\\1744305664851-69579078.jpg', 'uploads\\1744305664855-758616642.jpg', 'uploads\\1744305664871-576870619.jpg', 'uploads\\1744305664868-178911566.jpg', 'approved', NULL),
('653170010305', '1449400030577', 'Test2', 'Test2', 'api@gmail.com', '$2b$10$8.i.KiSjm07CbaZjEqe9GeRedGq/XDw0LR/TAbbQn8zpOSYlxh8Bm', '0639982238', '1/111', 'uploads\\1744257943273-496631594.png', 'uploads\\1744257943274-538423009.jpg', 'uploads\\1744257943279-814422625.jpg', 'uploads\\1744257943275-499457304.jpg', 'approved', NULL),
('653170010315', '1449400030556', 'ศุภกิตต์', 'ทองบ่อ', 'suphakit315@gmail.com', '$2b$10$6JtqMrqTBEBmmRqPN2PP1OWhsBgfmw8y1xwyPbFhRQWw.UX6WbAx.', '0812345789', 'Mahasarakham', 'uploads\\1752858507945-610781216.jpg', 'uploads\\1752858507947-880756780.png', 'uploads\\1752858507953-914887252.jpg', 'uploads\\1752858507950-558506722.png', 'approved', '4.50'),
('653170010317', '1449400020963', 'Bowon', 'Test2', 'aa@gmail.com', '$2b$10$pkfV1gKk02Y005feexaymu.rLxTkupp70u1VNe9GRwXylaeLcP8Em', '0639982238', '11/111', 'RiderProfilePic-1744268192202-864247249.jpg', 'RiderStudentCard-1744268167318-562333867.jpg', 'riderLicense-1744268180259-819664740.png', 'QRscan-1744268180258-433881191.png', 'approved', NULL),
('653170010320', '1449400020886', 'Puttipong', 'Tonjan', 'rider@gmail.com', '$2b$10$3If8rd43yuMNUNNYJ6m9Ceo2phr1pabcuLkPUMYXNYmMEP2D3hcA2', '0639982238', '11/111', 'RiderProfilePic-1744262619805-775326304.png', 'RiderStudentCard-1744268011894-561684477.jpg', 'riderLicense-1744310135910-718517667.jpg', 'QRscan-1744266567163-422278008.jpg', 'approved', '4.91'),
('653170010322', '1449400020887', 'Puttipong', 'Tonjan', 'rider2@gmail.com', '$2b$10$yIyL4WrVChcYn8VI5d3rxO08wO5/aXmMymc7gLf7Ta4PymWK0BDMi', '0639982238', '11/11', 'uploads\\1744222778375-537791501.jpg', 'uploads\\1744222778376-266694078.jpg', 'uploads\\1744222778379-972320298.png', 'uploads\\1744222778377-410962658.png', 'approved', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ridervehical`
--

CREATE TABLE `ridervehical` (
  `carId` int(11) NOT NULL,
  `riderId` varchar(15) DEFAULT NULL,
  `carType` varchar(50) NOT NULL,
  `plate` varchar(20) NOT NULL,
  `brand` enum('Honda','Yamaha','Suzuki','Kawasaki','Other') NOT NULL,
  `model` varchar(20) NOT NULL,
  `insurancePhoto` varchar(255) DEFAULT NULL,
  `carPhoto` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `ridervehical`
--

INSERT INTO `ridervehical` (`carId`, `riderId`, `carType`, `plate`, `brand`, `model`, `insurancePhoto`, `carPhoto`) VALUES
(1, '2147483647', 'motorcycle', '11', 'Suzuki', '12', 'uploads\\vehicles\\2147483647-insurancePhoto-1744190589837-330327426.jpg', 'uploads\\vehicles\\2147483647-carPhoto-1744190589843-300363383.jpg'),
(3, '2147483647', 'motorcycle', '1 กด 2560', 'Yamaha', 'เวฟ 110', '653170010320-insurancePhoto-1744215257418-489468926.jpg', '653170010320-carPhoto-1744215257423-302582675.png'),
(4, '653170010320', 'motorcycle', '7 ขก 4562', 'Yamaha', 'เวฟ 125', '653170010320-insurancePhoto-1744268043390-203969025.jpg', '653170010320-carPhoto-1744268043396-859096336.png'),
(5, '653170010322', 'motorcycle', '2 กด 7854', 'Yamaha', 'Mslaz', '653170010322-insurancePhoto-1744223018293-577745796.jpg', '653170010322-carPhoto-1744223018293-738024216.png'),
(6, '653170010317', 'car', '4 รวย 555', 'Suzuki', 'Swift', '653170010317-insurancePhoto-1744261014339-91680074.png', '653170010317-carPhoto-1744261014350-630532374.png'),
(7, '0000000000000', 'motorcycle', '9 กด 2560', 'Yamaha', 'Mslaz', '0000000000000-insurancePhoto-1744305992752-927516380.jpg', '0000000000000-carPhoto-1744305992754-434938081.png'),
(8, '653170010315', 'motorcycle', '2 กจ 4321', 'Honda', 'Wave 125', '653170010315-insurancePhoto-1752860126956-950946163.jpg', '653170010315-carPhoto-1752860788109-643010168.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `tb_user`
--

CREATE TABLE `tb_user` (
  `studentId` varchar(15) NOT NULL,
  `nationalId` varchar(13) NOT NULL,
  `userFirstname` varchar(30) NOT NULL,
  `userLastname` varchar(30) NOT NULL,
  `userEmail` varchar(50) NOT NULL,
  `userPass` varchar(255) NOT NULL,
  `userTel` varchar(15) NOT NULL,
  `userAddress` varchar(255) NOT NULL,
  `userprofilePic` varchar(255) DEFAULT NULL,
  `studentCard` varchar(255) DEFAULT NULL,
  `userRate` decimal(3,2) DEFAULT NULL,
  `role` enum('student','admin') DEFAULT 'student'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `tb_user`
--

INSERT INTO `tb_user` (`studentId`, `nationalId`, `userFirstname`, `userLastname`, `userEmail`, `userPass`, `userTel`, `userAddress`, `userprofilePic`, `studentCard`, `userRate`, `role`) VALUES
('653130020243', '14411445789', 'Phenkanlaya', 'Chantaloeng', 'phenkanlaya043@gmail.com', '$2b$10$YHdIaVkWGmUdDAVrIrWGr.ePDrOL4D09O9ONPd1vQKe9yG6Ak0qjW', '0944175037', 'Mahasarakham', '/uploads/profile_pics/profile-1752845747488-848952589.jpg', NULL, NULL, 'student'),
('653170010301', '', 'Test', 'Test1', 'test@gmail.com', '$2b$10$h5.ExfIE4aIo0gI3.nHR9Ozx8J8u3xZF5.iKqWSB5SLndAUu9Iu1K', '0639982238', '', NULL, NULL, NULL, 'student'),
('653170010302', '', 'Nattharika', 'Dithjaoen1', 'nattha@gmail.com', '$2b$10$ZPhs7I4zStSga1GQjiyZtOjgsnm6eccxnRPaOln6K9vZWHDz/Bdr6', '0968514711', '11/11', NULL, NULL, NULL, 'student'),
('653170010311', '1449400020112', 'Puttipong', 'Tonjan', 'admin@gmail.com', '$2b$10$BCHsFa4oD1nkZem12G/tC.crF8n/DxCD/Ya9wgVw.hXVFUQZvSscy', '1111111111', '11 qwer', NULL, NULL, NULL, 'admin'),
('653170010317', '', 'Bowon', 'Test2', 'st@gmail.com', '$2b$10$6WTOLfqUl.ZdWTILZBGK/OrHsVHrJDunBXntpIkFpQAcGophcbnPu', '0639982231', '', NULL, NULL, NULL, 'student'),
('653170010346', '', 'Puttipong', 'Tonjan', '11@gmail.com', '$2b$10$EG7YVq66uDTHD8ZQCxYrB.wCaWpC6W/jkhtF59E2eFXYzLXMmQnqm', '1111111111', '', NULL, NULL, NULL, 'student');

-- --------------------------------------------------------

--
-- Table structure for table `trips`
--

CREATE TABLE `trips` (
  `tripId` int(11) NOT NULL,
  `studentId` varchar(15) NOT NULL,
  `placeIdPickUp` int(11) NOT NULL,
  `placeIdDestination` int(11) NOT NULL,
  `date` datetime NOT NULL,
  `userRate` decimal(3,2) DEFAULT NULL,
  `carType` varchar(50) NOT NULL,
  `status` varchar(255) NOT NULL,
  `is_round_trip` varchar(255) NOT NULL,
  `rider_id` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `trips`
--

INSERT INTO `trips` (`tripId`, `studentId`, `placeIdPickUp`, `placeIdDestination`, `date`, `userRate`, `carType`, `status`, `is_round_trip`, `rider_id`) VALUES
(16, '653170010302', 1, 2, '2025-04-09 16:27:42', '5.00', 'motorcycle', 'success', '', '653170010320'),
(17, '653170010302', 2, 1, '2025-04-09 16:35:32', '5.00', 'motorcycle', 'success', '', '653170010320'),
(18, '653170010302', 2, 1, '2025-04-09 17:31:06', '5.00', 'motorcycle', 'success', '', '653170010320'),
(19, '653170010302', 2, 1, '2025-04-09 18:22:07', NULL, 'motorcycle', 'accepted', '', '653170010322'),
(20, '653170010301', 2, 1, '2025-04-09 18:25:18', NULL, 'motorcycle', 'success', '', '653170010317'),
(21, '653170010301', 3, 1, '2025-04-09 18:27:46', NULL, 'motorcycle', 'accepted', '', '653170010317'),
(22, '653170010346', 2, 3, '2025-04-10 06:57:32', NULL, 'motorcycle', 'success', '', '653170010320'),
(23, '653170010302', 3, 4, '2025-04-10 20:05:17', '5.00', 'motorcycle', 'success', '', '653170010320'),
(24, '653170010302', 4, 1, '2025-04-10 23:06:28', '4.00', 'motorcycle', 'success', '', '653170010320'),
(25, '653170010302', 2, 3, '2025-04-10 20:10:50', NULL, 'motorcycle', 'success', '', '653170010320'),
(26, '653170010302', 1, 2, '2025-04-10 20:13:41', '5.00', 'car', 'success', '', '653170010320'),
(27, '653170010317', 2, 3, '2025-04-12 15:55:51', NULL, 'car', 'success', '', '653170010320'),
(28, '653170010317', 1, 2, '2025-04-12 16:01:14', NULL, 'motorcycle', 'success', '', '653170010320'),
(29, '653170010317', 1, 3, '2025-04-12 16:04:10', NULL, 'car', 'success', '', '653170010320'),
(30, '653170010317', 1, 2, '2025-04-12 16:18:05', NULL, 'car', 'success', '1', '653170010320'),
(31, '653170010317', 2, 1, '2025-04-19 16:24:31', NULL, 'car', 'success', '1', '653170010320'),
(32, '653170010317', 2, 3, '2025-04-12 16:26:38', NULL, 'motorcycle', 'pending', '1', NULL),
(33, '653170010302', 3, 4, '2025-04-12 16:43:54', '5.00', 'motorcycle', 'success', '1', '653170010320'),
(34, '653170010346', 3, 2, '2025-06-13 06:35:56', NULL, 'car', 'pending', '1', NULL),
(35, '653170010302', 2, 1, '2025-06-13 06:37:31', NULL, 'motorcycle', 'pending', '0', NULL),
(36, '653170010302', 4, 1, '2025-06-13 06:38:31', NULL, 'car', 'pending', '0', NULL),
(37, '653170010302', 4, 3, '2025-06-13 06:39:23', NULL, 'motorcycle', 'pending', '0', NULL),
(38, '653170010302', 3, 1, '2025-06-13 06:39:56', NULL, 'car', 'pending', '1', NULL),
(39, '653170010302', 1, 4, '2025-06-13 06:40:16', NULL, 'motorcycle', 'pending', '1', NULL),
(40, '653170010302', 1, 4, '2025-06-13 06:40:31', NULL, 'car', 'pending', '0', NULL),
(41, '653170010302', 2, 4, '2025-06-13 06:49:12', NULL, 'motorcycle', 'pending', '0', NULL),
(42, '653170010302', 1, 4, '2025-06-13 06:49:34', NULL, 'car', 'pending', '1', NULL),
(43, '653170010302', 1, 4, '2025-06-13 07:02:02', NULL, 'motorcycle', 'pending', '1', NULL),
(44, '653170010302', 4, 3, '2025-06-13 07:05:47', NULL, 'motorcycle', 'pending', '0', NULL),
(45, '653170010302', 4, 3, '2025-06-13 07:06:12', NULL, 'motorcycle', 'pending', '0', NULL),
(46, '653170010302', 1, 2, '2025-06-13 07:09:53', NULL, 'car', 'pending', '1', NULL),
(47, '653170010302', 2, 3, '2025-06-13 07:11:55', NULL, 'car', 'pending', '1', NULL),
(48, '653170010302', 2, 4, '2025-06-13 07:13:35', NULL, 'motorcycle', 'pending', '1', NULL),
(49, '653170010302', 2, 3, '2025-06-13 07:18:08', '5.00', 'car', 'success', '0', '653170010320'),
(50, '653170010302', 3, 2, '2025-06-13 07:18:18', NULL, 'motorcycle', 'accepted', '1', '0000000000000'),
(51, '653170010302', 2, 3, '2025-06-23 05:00:07', NULL, 'motorcycle', 'pending', '1', NULL),
(52, '653170010302', 3, 4, '2025-07-06 15:27:35', '5.00', 'car', 'success', '1', '653170010320'),
(53, '653170010302', 2, 1, '2025-07-07 01:30:16', '5.00', 'motorcycle', 'success', '0', '653170010320'),
(54, '653170010302', 5, 3, '2025-07-18 07:51:48', '5.00', 'motorcycle', 'success', '0', '653170010320'),
(55, '653130020243', 3, 5, '2025-07-19 03:46:18', '5.00', 'car', 'success', '1', '653170010315'),
(56, '653130020243', 1, 5, '2025-07-19 03:55:09', '4.00', 'motorcycle', 'success', '1', '653170010315'),
(57, '653130020243', 2, 5, '2025-07-19 10:57:00', '4.50', 'motorcycle', 'success', '1', '653170010315');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `places`
--
ALTER TABLE `places`
  ADD PRIMARY KEY (`placeId`),
  ADD UNIQUE KEY `placeName` (`placeName`);

--
-- Indexes for table `riders`
--
ALTER TABLE `riders`
  ADD PRIMARY KEY (`riderId`),
  ADD UNIQUE KEY `riderEmail` (`riderEmail`);

--
-- Indexes for table `ridervehical`
--
ALTER TABLE `ridervehical`
  ADD PRIMARY KEY (`carId`),
  ADD KEY `riderId` (`riderId`);

--
-- Indexes for table `tb_user`
--
ALTER TABLE `tb_user`
  ADD PRIMARY KEY (`studentId`),
  ADD UNIQUE KEY `userEmail` (`userEmail`);

--
-- Indexes for table `trips`
--
ALTER TABLE `trips`
  ADD PRIMARY KEY (`tripId`),
  ADD KEY `studentId` (`studentId`),
  ADD KEY `placeIdPickUp` (`placeIdPickUp`),
  ADD KEY `placeIdDestination` (`placeIdDestination`),
  ADD KEY `trips_ibfk_4` (`rider_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `places`
--
ALTER TABLE `places`
  MODIFY `placeId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `ridervehical`
--
ALTER TABLE `ridervehical`
  MODIFY `carId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `trips`
--
ALTER TABLE `trips`
  MODIFY `tripId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `trips`
--
ALTER TABLE `trips`
  ADD CONSTRAINT `trips_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `tb_user` (`studentId`),
  ADD CONSTRAINT `trips_ibfk_2` FOREIGN KEY (`placeIdPickUp`) REFERENCES `places` (`placeId`),
  ADD CONSTRAINT `trips_ibfk_4` FOREIGN KEY (`rider_id`) REFERENCES `riders` (`riderId`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
