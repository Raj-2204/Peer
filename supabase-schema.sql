-- Enable RLS (Row Level Security) for all tables
-- Run this in your Supabase SQL Editor

-- Extend the auth.users table with additional profile info
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Friend requests table
CREATE TABLE public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Friend requests policies
CREATE POLICY "Users can view their own friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received friend requests" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Friends table (accepted friend requests)
CREATE TABLE public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Friends policies
CREATE POLICY "Users can view their friendships" ON public.friends
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Room members table
CREATE TABLE public.room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Room policies
CREATE POLICY "Users can view rooms they're members of" ON public.rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members 
      WHERE room_id = rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Room owners can update their rooms" ON public.rooms
  FOR UPDATE USING (auth.uid() = owner_id);

-- Room members policies
CREATE POLICY "Users can view room members of rooms they're in" ON public.room_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm 
      WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Room owners can manage members" ON public.room_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = room_members.room_id AND owner_id = auth.uid()
    )
  );

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to accept friend request and create friendship
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS VOID AS $$
DECLARE
  sender_user_id UUID;
  receiver_user_id UUID;
BEGIN
  -- Get the sender and receiver from the friend request
  SELECT sender_id, receiver_id INTO sender_user_id, receiver_user_id
  FROM public.friend_requests
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  IF sender_user_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  
  -- Update friend request status
  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;
  
  -- Create friendship (ensure consistent ordering)
  INSERT INTO public.friends (user1_id, user2_id)
  VALUES (
    LEAST(sender_user_id, receiver_user_id),
    GREATEST(sender_user_id, receiver_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;