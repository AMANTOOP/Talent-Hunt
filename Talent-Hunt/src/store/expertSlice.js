import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {databaseServices} from "../services/appwrite";

// for Asyncronous calls we use createAsyncThunk and as redux toolkit is syncrounous handling asyncronous 
//calls can be made easy by these it needs a string action type prefix like expert/fetchExpert
// for 3 states pending , success and rejected and this function auto dispatches the sucess and rejection to the state and action where the slice is present
//these functions are called Async thunk 
export const fetchExpert = createAsyncThunk(
  "expert/fetchExpert",
  async (id, { rejectWithValue }) => {
    try {
      const expert = await databaseServices.getExpert(id);
      return expert;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch expert");
    }
  }
);

export const createExpert = createAsyncThunk(
  "expert/createExpert",
  async (expertData, { rejectWithValue }) => {
    try {
      const expert = await databaseServices.createExpert(expertData);
      return expert;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to create expert");
    }
  }
);

export const updateExpert = createAsyncThunk(
  "expert/updateExpert",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const existingExpert = await databaseServices.getExpert(id);
      if (!existingExpert) {
        throw new Error("Expert not found");
      }
      
      const updatedExpert = {
        ...existingExpert,
        ...data
      };
      
      await databaseServices.deleteExpert(id);
      const expert = await databaseServices.createExpert(updatedExpert);
      
      return expert;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update expert");
    }
  }
);

export const deleteExpert = createAsyncThunk(
  "expert/deleteExpert",
  async (id, { rejectWithValue }) => {
    try {
      const success = await databaseServices.deleteExpert(id);
      if (!success) {
        throw new Error("Failed to delete expert");
      }
      return id;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete expert");
    }
  }
);

const initialState = {
  currentExpert: null,   // Currently viewed expert
  favorites: [],         // Favorited experts
  recentlyViewed: [],    // Recently viewed experts
  loading: false,        // for Loading state
  error: null            // for Error message
};

const expertSlice = createSlice({
  name: "expert",
  initialState,
  reducers: {
    addToFavorites: (state, action) => {
      const expert = action.payload;
      if (!state.favorites.some(fav => fav.$id === expert.$id)) {
        state.favorites.push(expert);
      }
    },
    
    removeFromFavorites: (state, action) => {
      const expertId = action.payload;
      state.favorites = state.favorites.filter(expert => expert.$id !== expertId);
    },
    
    addToRecentlyViewed: (state, action) => {
      const expert = action.payload;
      // Remove if already exists to avoid duplicates
      state.recentlyViewed = state.recentlyViewed.filter(exp => exp.$id !== expert.$id);
      // Add to the beginning of the array
      state.recentlyViewed.unshift(expert);
      // Keep only the last 5 viewed experts
      if (state.recentlyViewed.length > 5) {
        state.recentlyViewed = state.recentlyViewed.slice(0, 5);
      }
    },
    
    clearCurrentExpert: (state) => {
      state.currentExpert = null;
    },
    
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch expert
      .addCase(fetchExpert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpert.fulfilled, (state, action) => {
        state.currentExpert = action.payload;
        state.loading = false;
        // Add to recently viewed
        if (action.payload) {
          const expert = action.payload;
          state.recentlyViewed = state.recentlyViewed.filter(exp => exp.$id !== expert.$id);
          state.recentlyViewed.unshift(expert);
          if (state.recentlyViewed.length > 5) {
            state.recentlyViewed = state.recentlyViewed.slice(0, 5);
          }
        }
      })
      .addCase(fetchExpert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create expert
      .addCase(createExpert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createExpert.fulfilled, (state, action) => {
        state.currentExpert = action.payload;
        state.loading = false;
      })
      .addCase(createExpert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update expert
      .addCase(updateExpert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExpert.fulfilled, (state, action) => {
        state.currentExpert = action.payload;
        state.loading = false;
        // Update in favorites if exists
        const index = state.favorites.findIndex(exp => exp.$id === action.payload.$id);
        if (index !== -1) {
          state.favorites[index] = action.payload;
        }
        // Update in recently viewed if exists
        const recentIndex = state.recentlyViewed.findIndex(exp => exp.$id === action.payload.$id);
        if (recentIndex !== -1) {
          state.recentlyViewed[recentIndex] = action.payload;
        }
      })
      .addCase(updateExpert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
            
      // Delete expert
      .addCase(deleteExpert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExpert.fulfilled, (state, action) => {
        state.currentExpert = null;
        state.loading = false;
        // Remove from favorites if exists
        state.favorites = state.favorites.filter(expert => expert.$id !== action.payload);
        // Remove from recently viewed if exists
        state.recentlyViewed = state.recentlyViewed.filter(expert => expert.$id !== action.payload);
      })
      .addCase(deleteExpert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  addToFavorites, 
  removeFromFavorites, 
  addToRecentlyViewed, 
  clearCurrentExpert, 
  clearError 
} = expertSlice.actions;

export default expertSlice.reducer;