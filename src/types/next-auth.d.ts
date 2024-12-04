declare module 'next-auth' {
    interface Session {
        accessToken?: string;
        user: {
            id?: string;
            name?: string;
            email?: string;
            image?: string;
        }
    }
    
    interface Profile {
        email_verified?: boolean;
        email?: string;
    }
}
