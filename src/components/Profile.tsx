import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { Camera, Briefcase, MapPin, Phone, Globe, Award, Star, Edit2, Save, X } from 'lucide-react';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      
      try {
        const profileRef = doc(db, 'users', user.uid);
        const profileDoc = await getDoc(profileRef);
        
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
        } else {
          // Create a default profile if none exists
          const defaultProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            onboarded: true,
            reputation: 0,
            totalStaked: 0,
            successfulStakes: 0,
            failedStakes: 0,
            availableTokens: 0,
            lockedTokens: 0,
            totalEarnings: 0
          };
          await setDoc(profileRef, defaultProfile);
          setProfile(defaultProfile as UserProfile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid || Object.keys(editedProfile).length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...editedProfile,
        updatedAt: new Date().toISOString()
      });
      
      setProfile(prev => prev ? { ...prev, ...editedProfile } : null);
      setIsEditing(false);
      setEditedProfile({});
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-ocean-800 rounded-lg"></div>
            <div className="h-8 w-1/3 bg-ocean-800 rounded"></div>
            <div className="h-4 w-1/2 bg-ocean-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        <div className="card overflow-hidden">
          {/* Cover Photo Area */}
          <div className="h-48 bg-ocean-800 relative">
            <button className="absolute bottom-4 right-4 btn-secondary">
              <Camera className="w-4 h-4 mr-2" />
              Update Cover
            </button>
          </div>

          {/* Profile Header */}
          <div className="px-8 py-6 relative">
            <div className="flex justify-between items-start">
              <div className="flex items-end">
                <div className="w-32 h-32 bg-ocean-700 rounded-full border-4 border-ocean-800 -mt-20 overflow-hidden">
                  {profile?.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt={profile.displayName || 'Profile'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-ocean-600 text-ocean-300">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="ml-6">
                  <h1 className="text-2xl font-bold text-white">
                    {profile?.displayName || user?.displayName || 'Your Name'}
                  </h1>
                  <p className="text-ocean-300">
                    {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || user?.role || 'Role'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-primary"
                disabled={isSaving}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-400">
                  {profile?.totalDeals || 0}
                </p>
                <p className="text-sm text-ocean-300">Total Deals</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-400">
                  ${(profile?.totalVolume || 0).toLocaleString()}
                </p>
                <p className="text-sm text-ocean-300">Volume</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-400">
                  {profile?.rating?.toFixed(1) || '0.0'}
                </p>
                <p className="text-sm text-ocean-300">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-400">
                  ${(profile?.earnings || 0).toLocaleString()}
                </p>
                <p className="text-sm text-ocean-300">Earnings</p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="border-t border-ocean-700/50 px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">About</h3>
                  {isEditing ? (
                    <textarea
                      value={editedProfile.bio || profile?.bio || ''}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="input w-full h-32"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-ocean-300">
                      {profile?.bio || 'No bio provided'}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-ocean-300">
                      <Phone className="w-4 h-4 mr-3" />
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editedProfile.phone || profile?.phone || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                          className="input"
                          placeholder="Phone number"
                        />
                      ) : (
                        <span>{profile?.phone || 'No phone provided'}</span>
                      )}
                    </div>
                    <div className="flex items-center text-ocean-300">
                      <Globe className="w-4 h-4 mr-3" />
                      {isEditing ? (
                        <input
                          type="url"
                          value={editedProfile.website || profile?.website || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, website: e.target.value }))}
                          className="input"
                          placeholder="Website URL"
                        />
                      ) : (
                        <a 
                          href={profile?.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-primary-400 transition"
                        >
                          {profile?.website || 'No website provided'}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center text-ocean-300">
                      <MapPin className="w-4 h-4 mr-3" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedProfile.location || profile?.location || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, location: e.target.value }))}
                          className="input"
                          placeholder="Location"
                        />
                      ) : (
                        <span>{profile?.location || 'No location provided'}</span>
                      )}
                    </div>
                    <div className="flex items-center text-ocean-300">
                      <Briefcase className="w-4 h-4 mr-3" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedProfile.company || profile?.company || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, company: e.target.value }))}
                          className="input"
                          placeholder="Company"
                        />
                      ) : (
                        <span>{profile?.company || 'No company provided'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Licenses & Certifications</h3>
                  {isEditing ? (
                    <div className="space-y-2">
                      {(editedProfile.licenses || profile?.licenses || []).map((license, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={license}
                            onChange={(e) => {
                              const newLicenses = [...(editedProfile.licenses || profile?.licenses || [])];
                              newLicenses[index] = e.target.value;
                              setEditedProfile(prev => ({ ...prev, licenses: newLicenses }));
                            }}
                            className="input flex-1"
                          />
                          <button
                            onClick={() => {
                              const newLicenses = [...(editedProfile.licenses || profile?.licenses || [])];
                              newLicenses.splice(index, 1);
                              setEditedProfile(prev => ({ ...prev, licenses: newLicenses }));
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newLicenses = [...(editedProfile.licenses || profile?.licenses || []), ''];
                          setEditedProfile(prev => ({ ...prev, licenses: newLicenses }));
                        }}
                        className="btn-secondary w-full"
                      >
                        Add License
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profile?.licenses?.map((license, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary-400" />
                          <span className="text-ocean-300">{license}</span>
                        </div>
                      ))}
                      {(!profile?.licenses || profile.licenses.length === 0) && (
                        <p className="text-ocean-400">No licenses provided</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Reviews</h3>
                  <div className="space-y-4">
                    {profile?.reviews?.map((review) => (
                      <div key={review.id} className="bg-ocean-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{review.reviewerName}</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-ocean-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-ocean-300 text-sm">{review.comment}</p>
                      </div>
                    ))}
                    {(!profile?.reviews || profile.reviews.length === 0) && (
                      <p className="text-ocean-400">No reviews yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="border-t border-ocean-700/50 px-8 py-4">
              <button
                onClick={handleSave}
                disabled={isSaving || Object.keys(editedProfile).length === 0}
                className={`btn-primary w-full flex items-center justify-center ${
                  (isSaving || Object.keys(editedProfile).length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}