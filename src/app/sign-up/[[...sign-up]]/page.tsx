import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <SignUp 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
            card: 'bg-neutral-900 border border-neutral-800',
            headerTitle: 'text-white',
            headerSubtitle: 'text-neutral-400',
            formFieldLabel: 'text-neutral-300',
            formFieldInput: 'bg-neutral-800 border-neutral-700 text-white',
            footerActionLink: 'text-blue-500 hover:text-blue-400',
            identityPreviewText: 'text-neutral-300',
            identityPreviewEditButtonIcon: 'text-neutral-400',
            formResendCodeLink: 'text-blue-500 hover:text-blue-400',
            dividerLine: 'bg-neutral-800',
            dividerText: 'text-neutral-500',
            socialButtonsBlockButton: 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700',
            socialButtonsBlockButtonText: 'text-neutral-300',
            alertText: 'text-neutral-300',
            formHeaderTitle: 'text-white',
            formHeaderSubtitle: 'text-neutral-400',
            verificationLinkStatusIconBox__verified: 'text-green-500',
            verificationLinkStatusText__verified: 'text-green-500',
            otpCodeFieldInput: 'bg-neutral-800 border-neutral-700 text-white',
            formFieldSuccessText: 'text-green-500',
            formFieldErrorText: 'text-red-500',
            formFieldHintText: 'text-neutral-500',
            logoBox: 'justify-center',
            footer: 'hidden'
          },
          variables: {
            colorPrimary: '#3b82f6',
            colorBackground: '#171717',
            colorInputBackground: '#262626',
            colorInputText: '#ffffff',
          }
        }}
        redirectUrl="/"
        signInUrl="/sign-in"
      />
    </div>
  );
}