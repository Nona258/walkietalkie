import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import supabase from '../../utils/supabase';
import SweetAlertModal from '../../components/SweetAlertModal';

export default function EditProfile({ 
  onBackToSettings 
}: { 
  onBackToSettings?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [newImageSelected, setNewImageSelected] = useState(false);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    fetchUserData();
    requestImagePickerPermission();
  }, []);

  const requestImagePickerPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload a profile picture');
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        console.log('Current authenticated user ID:', user.id);
        setUserId(user.id);
        setEmail(user.email || '');
        
        // Show auth metadata immediately
        setFullName(user.user_metadata?.full_name || '');
        setPhoneNumber('');
        setProfilePicture(null);
        setLoading(false);

        // Then fetch and update with database data in background
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, phone_number, profile_picture_url')
          .eq('id', user.id);

        console.log('User ID being queried:', user.id);
        console.log('User data from Supabase:', data);
        console.log('Error from query:', error);

        if (error) {
          console.error('Query error:', error);
        }

        if (data && data.length > 0) {
          console.log('Record ID returned:', data[0].id);
          console.log('Full Name:', data[0].full_name);
          console.log('Phone Number:', data[0].phone_number);
          console.log('Phone Number type:', typeof data[0].phone_number);
          console.log('Profile Picture URL from DB:', data[0].profile_picture_url);
          console.log('All data:', JSON.stringify(data[0], null, 2));
          
          setFullName(data[0].full_name || user.user_metadata?.full_name || '');
          setPhoneNumber(data[0].phone_number && data[0].phone_number !== 'NULL' ? String(data[0].phone_number).trim() : '');
          
          if (data[0].profile_picture_url) {
            console.log('Setting profile picture to:', data[0].profile_picture_url);
            // Add cache buster to force fresh load
            const urlWithCacheBuster = `${data[0].profile_picture_url}?t=${Date.now()}`;
            setProfilePicture(urlWithCacheBuster);
          } else {
            console.log('No profile picture URL found');
            setProfilePicture(null);
          }
        } else {
          console.log('No data returned from users table for user ID:', user.id);
          setFullName(user.user_metadata?.full_name || '');
          setPhoneNumber('');
          setProfilePicture(null);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      Alert.alert('Error', 'Failed to load user data');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Launch image picker with free editing (no aspect ratio constraint)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Generate unique filename based on user ID and timestamp
        const fileName = `${userId}_${Date.now()}.jpg`;
        
        // Get dimensions of the cropped image
        const { width, height } = asset;
        
        // Only resize if image is larger than 800px in any dimension
        const actions = [];
        if (width > 800 || height > 800) {
          const scale = Math.min(800 / width, 800 / height);
          actions.push({
            resize: {
              width: Math.round(width * scale),
              height: Math.round(height * scale),
            },
          });
        }
        
        // Optimize image with compression
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          asset.uri,
          actions.length > 0 ? actions : [],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        console.log('Image cropped freely by user:', {
          originalDimensions: { width, height },
          uri: manipulatedImage.uri,
          fileName: fileName,
        });
        
        setNewImageUri(manipulatedImage.uri);
        setImageFileName(fileName);
        setProfilePicture(manipulatedImage.uri); // Show preview
        setNewImageSelected(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick or crop image');
    }
  };

  const uploadProfilePicture = async (imageUri: string): Promise<string | null> => {
    try {
      if (!imageFileName) {
        console.error('No image file name set');
        return null;
      }

      console.log('Starting image upload...');
      console.log('Image URI:', imageUri);
      console.log('Image file name:', imageFileName);

      // Fetch the image as a blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size, 'type:', blob.type);

      // Upload to Supabase bucket
      const { data, error } = await supabase.storage
        .from('profile_picture')
        .upload(imageFileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      console.log('Upload successful, data:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile_picture')
        .getPublicUrl(imageFileName);

      const publicUrl = urlData?.publicUrl;
      console.log('Public URL generated:', publicUrl);

      if (!publicUrl) {
        throw new Error('Failed to generate public URL');
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return;
    }

    try {
      setSaving(true);
      let profilePictureUrl: string | null = profilePicture;

      console.log('Starting save process...');
      console.log('New image selected:', newImageSelected);

      // Upload new image if selected
      if (newImageSelected && newImageUri) {
        console.log('Uploading new profile picture...');
        const uploadedUrl = await uploadProfilePicture(newImageUri);
        console.log('Profile picture uploaded successfully:', uploadedUrl);
        profilePictureUrl = uploadedUrl;
      }

      console.log('Updating database with:', {
        full_name: fullName,
        phone_number: phoneNumber,
        profile_picture_url: profilePictureUrl,
      });

      // Update user profile in database
      const { data: updateData, error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          profile_picture_url: profilePictureUrl,
        })
        .eq('id', userId)
        .select();

      console.log('Update response - Data:', updateData);
      console.log('Update response - Error:', error);

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      if (updateData && updateData.length > 0) {
        console.log('Updated record:', updateData[0]);
        console.log('Server returned profile_picture_url:', updateData[0].profile_picture_url);
        
        // Set the profile picture with cache buster
        if (updateData[0].profile_picture_url) {
          const urlWithCacheBuster = `${updateData[0].profile_picture_url}?t=${Date.now()}`;
          setProfilePicture(urlWithCacheBuster);
        }
      }

      console.log('Database update successful');
      setShowSuccessAlert(true);
      setNewImageSelected(false);
      setNewImageUri(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile changes';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessAlertConfirm = () => {
    setShowSuccessAlert(false);
    // Refresh user data to show updated profile picture
    setTimeout(() => {
      fetchUserData();
      onBackToSettings?.();
    }, 500);
  };

  return (
    <View className="flex-1 w-full bg-white">
      <StatusBar barStyle="light-content" />
      
      <SweetAlertModal
        visible={showSuccessAlert}
        title="Success"
        message="Profile updated successfully!"
        type="success"
        confirmText="OK"
        onConfirm={handleSuccessAlertConfirm}
      />
      
      <View className="flex-1 w-full flex-col">
        {/* HEADER WITH BACK BUTTON */}
        <View className="bg-white pt-6 pb-6 px-6 flex-row items-center gap-4">
          <TouchableOpacity 
            onPress={onBackToSettings}
            className="h-10 w-10 rounded-full bg-green-100 items-center justify-center active:scale-95"
          >
            <Ionicons name="chevron-back" size={24} color="#10b981" />
          </TouchableOpacity>
          <Text className="text-gray-900 text-2xl font-extrabold">Edit Profile</Text>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView 
          className="flex-1 w-full"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30 }}
          showsVerticalScrollIndicator={true}
        >
          {/* Profile Picture Section */}
          <View className="items-center mb-8">
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.7}
              className="relative"
            >
              <View className="h-32 w-32 rounded-full bg-green-100 items-center justify-center overflow-hidden border-4 border-green-200">
                {profilePicture ? (
                  <>
                    <Image 
                      key={profilePicture}
                      source={{ uri: profilePicture }}
                      style={{ width: 128, height: 128, borderRadius: 64 }}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('Image load error:', error);
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', profilePicture);
                      }}
                    />
                  </>
                ) : (
                  <Ionicons name="person" size={64} color="#10b981" />
                )}
              </View>
              <View className="absolute bottom-0 right-0 bg-green-500 rounded-full p-3 border-4 border-white active:scale-90">
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <Text className="text-gray-500 text-sm mt-4 text-center">Tap to change profile picture</Text>
          </View>

          {/* Form Section */}
          <View className="mb-6">
            <Text className="text-gray-800 text-lg font-bold mb-4">Personal Information</Text>

            {/* Full Name Input */}
            <View className="mb-5">
              <Text className="text-gray-700 font-semibold mb-2">Full Name</Text>
              <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
                <Ionicons name="person-outline" size={20} color="#10b981" />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 font-medium"
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!saving}
                />
              </View>
            </View>

            {/* Email Input (Read-only) */}
            <View className="mb-5">
              <Text className="text-gray-700 font-semibold mb-2">Email</Text>
              <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3 border border-gray-200">
                <Ionicons name="mail-outline" size={20} color="#10b981" />
                <TextInput
                  className="flex-1 ml-3 text-gray-600 font-medium"
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  editable={false}
                />
              </View>
              <Text className="text-gray-400 text-xs mt-1">Email cannot be changed</Text>
            </View>

            {/* Phone Number Input */}
            <View className="mb-5">
              <Text className="text-gray-700 font-semibold mb-2">Phone Number</Text>
              <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
                <Ionicons name="call-outline" size={20} color="#10b981" />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 font-medium"
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9ca3af"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  editable={!saving}
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
            className="bg-green-500 rounded-2xl p-4 flex-row items-center justify-center active:scale-95 shadow-md shadow-green-300 disabled:opacity-60"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={24} color="white" />
                <Text className="text-white font-bold ml-3 text-lg">Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={onBackToSettings}
            disabled={saving}
            activeOpacity={0.8}
            className="bg-red-500 rounded-2xl p-4 flex-row items-center justify-center active:scale-95 mt-3 disabled:opacity-60 shadow-md shadow-red-300"
          >
            <Ionicons name="close" size={24} color="white" />
            <Text className="text-white font-bold ml-3 text-lg">Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}
