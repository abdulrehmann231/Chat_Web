CREATE TABLE Users (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Friends (
    FriendshipID SERIAL PRIMARY KEY,
    UserID1 INT,
    UserID2 INT,
    EstablishedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID1) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (UserID2) REFERENCES Users(UserID) ON DELETE CASCADE,
    CONSTRAINT unique_friendship UNIQUE (UserID1, UserID2)
);
CREATE TABLE Chats (
    ChatID SERIAL PRIMARY KEY,
    ChatName VARCHAR(100),  -- For group chats, null for one-to-one chats
    IsGroupChat BOOLEAN NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ChatMembers (
    ChatMemberID SERIAL PRIMARY KEY,
    ChatID INT,
    UserID INT,
    FOREIGN KEY (ChatID) REFERENCES Chats(ChatID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    JoinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE MessageTypes (
    MessageTypeID SERIAL PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE  -- Values could be 'text' or 'voice'
);

-- Table to store messages
CREATE TABLE Messages (
    MessageID SERIAL PRIMARY KEY,
    ChatID INT,
    UserID INT,
    MessageTypeID INT,
    TextContent TEXT,  -- For text messages, this stores the message.
    VoiceContent BYTEA,  -- For voice messages, this stores the binary data.
    SentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ChatID) REFERENCES Chats(ChatID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (MessageTypeID) REFERENCES MessageTypes(MessageTypeID)
);
CREATE TABLE VideoCalls (
    VideoCallID SERIAL PRIMARY KEY,
    ChatID INT,
    InitiatorUserID INT,
    StartTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    EndTime TIMESTAMP,
    FOREIGN KEY (ChatID) REFERENCES Chats(ChatID) ON DELETE CASCADE,
    FOREIGN KEY (InitiatorUserID) REFERENCES Users(UserID) ON DELETE CASCADE
);