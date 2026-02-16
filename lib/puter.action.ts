import puter from "@heyputer/puter.js";



export const SignIn = async () => await puter.auth.signIn();
export const SignOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch (error) {
    return null
  }
}