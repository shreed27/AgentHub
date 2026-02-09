"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  FC,
  ReactNode,
} from "react";
import { CustomWalletModal } from "@/components/wallet/CustomWalletModal";

interface CustomWalletModalContextType {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const CustomWalletModalContext = createContext<CustomWalletModalContextType>({
  visible: false,
  setVisible: () => {},
});

export const useCustomWalletModal = () => useContext(CustomWalletModalContext);

interface CustomWalletModalProviderProps {
  children: ReactNode;
}

export const CustomWalletModalProvider: FC<CustomWalletModalProviderProps> = ({
  children,
}) => {
  const [visible, setVisibleState] = useState(false);

  const setVisible = useCallback((value: boolean) => {
    setVisibleState(value);
  }, []);

  return (
    <CustomWalletModalContext.Provider value={{ visible, setVisible }}>
      {children}
      <CustomWalletModal isOpen={visible} onClose={() => setVisible(false)} />
    </CustomWalletModalContext.Provider>
  );
};
