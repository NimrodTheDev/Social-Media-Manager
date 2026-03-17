import { api } from '../api'
import { useAuth } from './useAuth'
const { token } = useAuth()
const useConnectSocial = () => {
    const connectSocial = (platformId) => {
        // OAuth flows require full browser navigation, not background fetches
        window.location.href = `/api/connect/${platformId}?token=${token.value}`
    }
    const connectedAccounts = async () => {
        const response = await api(`/connected-accounts`);
        console.log(response);
        return response.data;
    }
    return {
        connectSocial,
        connectedAccounts
    }
}

export { useConnectSocial }